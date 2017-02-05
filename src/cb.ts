#!/usr/bin/env node
import {DocsFileOutput, DocsCommandComplete, DocsCommandOutput} from "./command.docs";
import {InitCommandComplete, InitCommandOutput} from "./command.init";
import {WatchersCommandComplete, WatchersCommandOutput} from "./command.watchers";
import {WatchCommmandComplete, WatchCommandSetup} from "./command.watch";
import {ExitSignal, CBSignal, SignalTypes, FileWriteSignal} from "./config";
import {TasksCommandComplete} from "./command.tasks";
import {RunComplete} from "./command.run.execute";
import {TaskReport, TaskReportType} from "./task.runner";
import {RunCommandSetup} from "./command.run";
import {WatchTaskReport} from "./watch.file-watcher";
import {LogLevel} from "./reporters/defaultReporter";

import cli from "./cli";
import {readFileSync, writeFileSync} from "fs";
import {handleIncoming, getSetup, PreparedInput} from "./index";
import logger from "./logger";
import {PostCLIParse} from "./cli";
import {prepareInput} from "./index";

import * as reports from "./reporter.resolve";
import * as file from "./file.utils";
import * as seq from "./task.sequence";

import Rx = require("rx");


const debug = require("debug")("cb:cli");
const _ = require('../lodash.custom');
const parsed = cli(process.argv.slice(2));

const cliOutputObserver = new Rx.Subject<reports.OutgoingReport>();

const defaultReporter = reports.getDefaultReporter();
const defaultReporterFn = (input) => {
    const output = defaultReporter(input);
    if (output.data.length) {
        output.data.forEach(line => logger.info(line));
    }
};

const cliSignalObserver = new Rx.Subject<CBSignal<ExitSignal>>();

if (parsed.execute) {
    runFromCli(parsed, defaultReporterFn, cliSignalObserver);
} else {
    if (parsed.cli.flags.version) {
        console.log(parsed.output[0]);
    } else {
        if (parsed.output.length) {
            cliOutputObserver.onNext({
                origin: reports.ReportTypes.CLIParserOutput,
                data: parsed.output
            });
        }
    }
}

export interface CLIResults {
    setup: RunCommandSetup;
    reports: TaskReport[];
    timestamp: number;
}

function runFromCli(parsed: PostCLIParse, report, cliSignalObserver): void {

    const addReporterIfMissing = (setup, fn) =>
        setup.reporters.length === 0
            ? _.merge({}, setup, {reportFn: fn})
            : setup;

    const killSwitches$ = new Rx.Subject();

    killSwitches$.subscribe(() => {
        process.exit(1);
    });

    getSetup(parsed.cli)
        .map(x => addReporterIfMissing(x, report))
        .fold(err => {
            // report(err);
            // killSwitches$.onNext(true);
            // todo log input errors
            console.log(err);
            return err;
        }, (setup: PreparedInput) => {
            if (parsed.cli.command === 'run') {
                runWithSetup(setup, killSwitches$);
            }
        });
}

function runWithSetup(prepared: PreparedInput, killSwitches$) {

    const setUp$ = new Rx.BehaviorSubject({});
    const progress$ = new Rx.BehaviorSubject([]);

    let summaryGiven = false; // todo remove the need for this as it breaks the encapsulation

    const exitSignal$ = cliSignalObserver
        .filter(x => x.type === SignalTypes.Exit)
        .do((cbSignal: CBSignal<ExitSignal>) => prepared.reportFn({
            type: reports.ReportTypes.SignalReceived,
            data: cbSignal.data
        }))
        .withLatestFrom(setUp$, progress$, (signal, setup, reports) => {
            return {reports, setup, signal};
        });

    const exits$ = Rx.Observable.zip(
        Rx.Observable.just(true).timestamp(prepared.config.scheduler),
        exitSignal$.timestamp(prepared.config.scheduler),
        (begin: {value: boolean, timestamp: number}, signal: {value: {reports: TaskReport[], setup: RunCommandSetup, signal: CBSignal<ExitSignal>}, timestamp: number}) => {
            return {begin, signal};
        }
    ).do((incoming) => {

        const {signal, begin} = incoming;
        const setup: RunCommandSetup = signal.value.setup;
        const reports: TaskReport[] = signal.value.reports;

        const startTime = begin.timestamp;
        const endTime = signal.timestamp;

        /**
         * Main summary report, although here it could be partial
         * (as an exit command could occur at any time)
         */
        if ((setup.tasks.valid.length * 2) !== reports.length) {
            if (!summaryGiven) {
                summaryGiven = true;
                handleCompletion(reports, setup, endTime - startTime);
            }
        } else {
            console.log("Exit signal, but summary given from main handler");
        }
    });

    const reports$: Rx.Observable<CLIResults> = handleIncoming<RunComplete>(prepared)
        .do(x => setUp$.onNext(x.setup)) // first item is the setup
        .flatMap(x => {
            if (x.setup.errors.length) {
                killSwitches$.onNext(true);
                return Rx.Observable.empty();
            }
            if (x.setup.tasks.invalid.length) {
                killSwitches$.onNext(true);
                return Rx.Observable.empty();
            }
            return x.update$;
        })
        .do(x => progress$.onNext(progress$.getValue().concat(x)))
        .do((report: TaskReport) => {
            prepared.reportFn({
                type: reports.ReportTypes.TaskReport,
                data: {
                    report,
                    config: prepared.config
                } as reports.TaskReportReport
            });
        })
        .takeUntil(exits$)
        .toArray()
        .filter(reports => reports.length > 0)
        .timestamp(prepared.config.scheduler)
        .withLatestFrom(setUp$, (incoming: {value: TaskReport[], timestamp: number}, setup: RunCommandSetup) => {
            return {
                setup,
                reports: incoming.value,
                timestamp: incoming.timestamp
            };
        });

    Rx.Observable.zip(
        Rx.Observable.just(true).timestamp(prepared.config.scheduler),
        reports$,
        (begin: {value: boolean, timestamp: number}, result: CLIResults) => {
            return {begin, result};
        }
    ).subscribe(function (incoming) {
        if (!summaryGiven) {
            summaryGiven = true;
            handleCompletion(
                incoming.result.reports,
                incoming.result.setup,
                incoming.result.timestamp - incoming.begin.timestamp
            );
        }
    });
    /**
     * Because errors are handled by reports, task executions ALWAYS complete
     * and we handle that here.
     */
    function handleCompletion(taskReports: TaskReport[], setup: RunCommandSetup, runtime: number): void {

        /**
         * Merge sequence tree with Task Reports
         */
        const decoratedSequence = seq.decorateSequenceWithReports(setup.sequence, taskReports);

        /**
         * Push a 'Completion report' onto the $complete Observable.
         * This means consumers will get everything when they call
         */
        const errors = taskReports.filter(x => x.type === TaskReportType.error);

        const completeData = {
            errors,
            runtime,
            taskErrors: errors,
            sequence: decoratedSequence,
            cli: prepared.cli,
            config: prepared.config
        };

        /**
         * Main summary report
         */
        prepared.reportFn({
            type: reports.ReportTypes.Summary,
            data: completeData
        });

        require("./command.run.post-execution").postCliExecution(completeData);
    }
}


    // /**
    //  * Handle file-writes
    //  * @type {Rx.Observable<CBSignal<FileWriteSignal>>|Rx.Observable<T>}
    //  */
    // cliSignalObserver
    //     .filter(x => x.type === SignalTypes.FileWrite)
    //     .do(function (x: CBSignal<FileWriteSignal>) {
    //         if (prepared.config.dryRun) {
    //             // should skip / noop here
    //         } else {
    //             file.writeFileToDisk(x.data.file, x.data.content);
    //         }
    //     }).subscribe();
    //
    // /**
    //  * Any errors found on input preparation
    //  * will be sent to the output observer and
    //  * requires no further work other than to exit
    //  * with a non-zero code
    //  */
    // if (prepared.errors.length) {
    //     return killSwitches$.onNext(true);
    // }
    //
    //
    // if (parsed.cli.command === "tasks" || parsed.cli.command === "ls") {
    //     handleIncoming<TasksCommandComplete>(prepared)
    //         .subscribe(x => {
    //             const {groups, tasks} = x.setup;
    //             const invalid = groups.reduce((acc, group) => acc.concat(group.tasks.invalid), []);
    //
    //             if (invalid.length || prepared.config.verbose === LogLevel.Verbose) {
    //                 return prepared.reportFn({
    //                     type: reports.ReportTypes.TaskTree,
    //                     data: {
    //                         tasks,
    //                         config: prepared.config,
    //                         title: invalid.length ? "Errors found:" : "Available Tasks:"
    //                     } as reports.TaskTreeReport
    //                 });
    //             }
    //
    //             if (!groups.length) {
    //                 return prepared.reportFn({type: reports.ReportTypes.NoTasksAvailable});
    //             }
    //
    //             prepared.reportFn({
    //                 type: reports.ReportTypes.SimpleTaskList,
    //                 data: {setup: x.setup}
    //             });
    //         });
    // }
    //
    // if (parsed.cli.command === "docs") {
    //     handleIncoming<DocsCommandComplete>(prepared)
    //         .pluck("setup")
    //         .subscribe((setup: DocsCommandOutput) => {
    //             if (setup.errors.length || setup.tasks.invalid.length) {
    //                 return killSwitches$.onNext(true);
    //             }
    //             setup.output.forEach(function (outputItem: DocsFileOutput) {
    //                 file.writeFileToDisk(outputItem.file, outputItem.content);
    //             });
    //         });
    // }
    //
    // if (parsed.cli.command === "init") {
    //     handleIncoming<InitCommandComplete>(prepared)
    //         .pluck("setup")
    //         .subscribe((setup: InitCommandOutput) => {
    //             if (setup.errors.length) {
    //                 return killSwitches$.onNext(true);
    //             }
    //             writeFileSync(setup.outputFilePath, readFileSync(setup.templateFilePath));
    //         });
    // }
    //
    // if (parsed.cli.command === "watchers") {
    //     handleIncoming<WatchersCommandComplete>(prepared)
    //         .pluck("setup")
    //         .subscribe((setup: WatchersCommandOutput) => {
    //             if (setup.errors.length) {
    //                 return killSwitches$.onNext(true);
    //             }
    //             prepared.reportFn({
    //                 type: reports.ReportTypes.WatcherNames,
    //                 data: {setup}
    //             });
    //         });
    // }
    //
    // if (parsed.cli.command === "watch") {
    //     handleIncoming<WatchCommmandComplete>(prepared)
    //         .flatMap((x: {setup: WatchCommandSetup, update$: Rx.Observable<WatchTaskReport>}) => {
    //             if (x.setup.errors.length) {
    //                 killSwitches$.onNext(true);
    //                 return Rx.Observable.empty();
    //             }
    //             return x.update$;
    //         })
    //         .subscribe();
    // }
// }
