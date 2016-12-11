#!/usr/bin/env node
import cli from "./cli";
import {readFileSync, writeFileSync} from "fs";
import {handleIncoming} from "./index";
import logger from "./logger";
import Rx = require('rx');
import * as reports from "./reporter.resolve";
import {PostCLIParse} from "./cli";
import {prepareInput} from "./index";
import {DocsFileOutput, DocsCommandComplete, DocsCommandOutput} from "./command.docs";
import * as file from "./file.utils";
import {InitCommandComplete, InitCommandOutput} from "./command.init";
import {WatchersCommandComplete, WatchersCommandOutput} from "./command.watchers";
import {WatchCommmandComplete, WatchCommandEventTypes, WatchCommandSetup} from "./command.watch";
import {ExitSignal, CBSignal, SignalTypes, FileWriteSignal} from "./config";
import {ReportTypes} from "./reporter.resolve";
import {TasksCommandComplete} from "./command.tasks";
import {RunComplete} from "./command.run.execute";
import {TaskReport, TaskReportType} from "./task.runner";
import {RunCommandSetup} from "./command.run";
import * as seq from "./task.sequence";
import {SummaryReport} from "./reporter.resolve";
import {TaskReportReport} from "./reporter.resolve";
import {WatchTaskReport} from "./watch.file-watcher";
import {getLongestTaskName} from "./task.utils";
import {SimpleTaskListReport} from "./reporter.resolve";
import {TaskTreeReport} from "./reporter.resolve";
import {LogLevel} from "./reporters/defaultReporter";
const debug = require('debug')('cb:cli');

const parsed = cli(process.argv.slice(2));

const cliOutputObserver = new Rx.Subject<reports.OutgoingReport>();
cliOutputObserver.subscribe(function (report) {
    report.data.forEach(function (x) {
        logger.info(x);
    });
});

const cliSignalObserver = new Rx.Subject<CBSignal<ExitSignal>>();

if (parsed.execute) {
    runFromCli(parsed, cliOutputObserver, cliSignalObserver);
} else {
    if (parsed.cli.flags.version) {
        console.log(parsed.output[0]);
    } else {
        if (parsed.output.length) {
            cliOutputObserver.onNext({
                origin: ReportTypes.CLIParserOutput,
                data: parsed.output
            });
        }
    }
}

export interface CLIResults {
    setup: RunCommandSetup,
    reports: TaskReport[],
    timestamp: number
}

function runFromCli(parsed: PostCLIParse, cliOutputObserver, cliSignalObserver): void {

    const prepared = prepareInput(parsed.cli, null, cliOutputObserver, cliSignalObserver);

    /**
     * Handle file-writes
     * @type {Rx.Observable<CBSignal<FileWriteSignal>>|Rx.Observable<T>}
     */
    cliSignalObserver
        .filter(x => x.type === SignalTypes.FileWrite)
        .do(function (x: CBSignal<FileWriteSignal>) {
            if (prepared.config.dryRun) {
                // should skip / noop here
            } else {
                file.writeFileToDisk(x.data.file, x.data.content);
            }
        }).subscribe();

    /**
     * Any errors found on input preparation
     * will be sent to the output observer and
     * requires no further work other than to exit
     * with a non-zero code
     */
    if (prepared.errors.length) {
        return process.exit(1);
    }

    if (parsed.cli.command === 'run') {

        const setUp$     = new Rx.BehaviorSubject({});
        const progress$  = new Rx.BehaviorSubject([]);
        let summaryGiven = false; // todo remove the need for this as it breaks the encapsulation

        const exitSignal$ = cliSignalObserver
            .filter(x => x.type === SignalTypes.Exit)
            .do((cbSignal: CBSignal<ExitSignal>) => prepared.reportFn({type: ReportTypes.SignalReceived, data: cbSignal.data}))
            .withLatestFrom(setUp$, progress$, (signal, setup, reports) => {
                return {reports, setup, signal};
            });

        const exits$ = Rx.Observable.zip(
            Rx.Observable.just(true).timestamp(prepared.config.scheduler),
            exitSignal$.timestamp(prepared.config.scheduler),
            (begin: {value:boolean,timestamp:number}, signal:{value: {reports:TaskReport[], setup:RunCommandSetup, signal: CBSignal<ExitSignal>}, timestamp: number}) => {
                return {begin, signal};
            }
        ).do((incoming) => {

            const {signal, begin} = incoming;
            const setup:    RunCommandSetup      = signal.value.setup;
            const reports:  TaskReport[]         = signal.value.reports;

            const startTime = begin.timestamp;
            const endTime   = signal.timestamp;

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
                console.log('Exit signal, but summary given from main handler');
            }
        });

        const reports$: Rx.Observable<CLIResults> = handleIncoming<RunComplete>(prepared)
            .do(x => setUp$.onNext(x.setup)) // first item is the setup
            .flatMap(x => {
                if (x.setup.errors.length) {
                    console.log('Error in setup', x.setup.errors);
                    return Rx.Observable.empty();
                }
                return x.update$;
            })
            .do(x => progress$.onNext(progress$.getValue().concat(x)))
            .do((report: TaskReport) => {
                prepared.reportFn({
                    type: ReportTypes.TaskReport,
                    data: {
                        report,
                        progress: prepared.config.progress
                    }
                } as TaskReportReport);
            })
            .takeUntil(exits$)
            .toArray()
            .filter(reports => reports.length > 0)
            .timestamp(prepared.config.scheduler)
            .withLatestFrom(setUp$, (incoming: {value: TaskReport[], timestamp:number}, setup: RunCommandSetup) => {
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
    }

    /**
     * Because errors are handled by reports, task executions ALWAYS complete
     * and we handle that here.
     */
    function handleCompletion (reports: TaskReport[], setup: RunCommandSetup, runtime: number): void {

        /**
         * Merge sequence tree with Task Reports
         */
        const decoratedSequence = seq.decorateSequenceWithReports(setup.sequence, reports);

        /**
         * Push a 'Completion report' onto the $complete Observable.
         * This means consumers will get everything when they call
         */
        const errors = reports.filter(x => x.type === TaskReportType.error);

        const completeData = {
            errors,
            runtime,
            taskErrors: errors,
            sequence:   decoratedSequence,
            cli:        prepared.cli,
            config:     prepared.config
        };

        /**
         * Main summary report
         */
        prepared.reportFn({
            type: ReportTypes.Summary,
            data: completeData
        } as SummaryReport);

        require('./command.run.post-execution').postCliExecution(completeData);
    }

    if (parsed.cli.command === 'tasks' || parsed.cli.command === 'ls') {
        handleIncoming<TasksCommandComplete>(prepared)
            .subscribe(x => {
                const {groups, tasks} = x.setup;
                const invalid = groups.reduce((acc, group) => acc.concat(group.tasks.invalid), []);

                if (invalid.length || prepared.config.verbose === LogLevel.Verbose) {
                    return prepared.reportFn({
                        type: ReportTypes.TaskTree,
                        data: {
                            tasks,
                            config: prepared.config,
                            title: invalid.length ? 'Errors found:' : 'Available Tasks:'
                        }
                    } as TaskTreeReport);
                }

                prepared.reportFn({
                    type: ReportTypes.SimpleTaskList,
                    data: x.setup
                } as SimpleTaskListReport);
                // console.log(groups);
            });
    }

    if (parsed.cli.command === 'docs') {
        handleIncoming<DocsCommandComplete>(prepared)
            .pluck('setup')
            .subscribe((setup: DocsCommandOutput) => {
                if (setup.errors.length) {
                    return process.exit(1);
                }
                setup.output.forEach(function (outputItem: DocsFileOutput) {
                    file.writeFileToDisk(outputItem.file, outputItem.content);
                });
            })
    }

    if (parsed.cli.command === 'init') {
        handleIncoming<InitCommandComplete>(prepared)
            .pluck('setup')
            .subscribe((setup: InitCommandOutput) => {
                if (setup.errors.length) {
                    return process.exit(1);
                }
                writeFileSync(setup.outputFilePath, readFileSync(setup.templateFilePath));
            });
    }

    if (parsed.cli.command === 'watchers') {
        handleIncoming<WatchersCommandComplete>(prepared)
            .pluck('setup')
            .subscribe((setup: WatchersCommandOutput) => {
                if (setup.errors.length) {
                    return process.exit(1);
                }
            });
    }

    if (parsed.cli.command === 'watch') {
        handleIncoming<WatchCommmandComplete>(prepared)
            .flatMap((x: {setup:WatchCommandSetup, update$: Rx.Observable<WatchTaskReport>}) => {
                if (x.setup.errors.length) {
                    process.exit(1);
                    return Rx.Observable.empty();
                }
                return x.update$;
            })
            .subscribe();
    }
}
