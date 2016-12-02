#!/usr/bin/env node
import cli from "./cli";
import {readFileSync, writeFileSync} from "fs";
import {handleIncoming} from "./index";
import logger from "./logger";
import Rx = require('rx');
import * as reports from "./reporter.resolve";
import {PostCLIParse} from "./cli";
import {prepareInput} from "./index";
import {DocsFileOutput, DocsCommandComplete} from "./command.docs";
import * as file from "./file.utils";
import {InitCommandComplete} from "./command.init";
import {WatchersCommandComplete} from "./command.watchers";
import {WatchCommmandComplete, WatchCommandEventTypes, WatchCommandSetup} from "./command.watch";
import {ExitSignal, CBSignal, SignalTypes, FileWriteSignal} from "./config";
import {ReportTypes} from "./reporter.resolve";
import {TasksCommandComplete} from "./command.tasks";
import {RunComplete, RunCommandReportTypes, RunCommandCompletionReport} from "./command.run.execute";
import {TaskReport, TaskReportType} from "./task.runner";
import {RunCommandSetup} from "./command.run";
import * as seq from "./task.sequence";
import {SummaryReport} from "./reporter.resolve";

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

function runFromCli (parsed: PostCLIParse, cliOutputObserver, cliSignalObserver): void {

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
        });

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

        const setUp$                     = new Rx.BehaviorSubject({});
        const reports$                   = new Rx.BehaviorSubject([]);

        const runSubscription = handleIncoming<RunComplete>(prepared)
            .do(x => setUp$.onNext(x.runSetup)) // first item is the setup
            .flatMap(x => {
                if (x.runSetup.errors.length) {
                    console.log('Error in setup', x.runSetup.errors);
                    return Rx.Observable.empty();
                }
                return x.update$
                    .do((taskReport: TaskReport) => {
                        reports$.onNext(reports$.getValue().concat(taskReport));
                    });
            });

        const exitSignal = cliSignalObserver
            .filter(x => x.type === SignalTypes.Exit)
            .withLatestFrom(setUp$, reports$) // todo pass latest values from reports + setup
            .do((incoming) => {

                const cbSignal: CBSignal<ExitSignal> = incoming[0];
                const setup: RunCommandSetup         = incoming[1];
                const reports: TaskReport[]          = incoming[2];
                const decoratedSequence              = seq.decorateSequenceWithReports(setup.sequence, reports);
                const errors                         = reports.filter(x => x.type === TaskReportType.error);

                prepared.reportFn({type: ReportTypes.SignalReceived, data: cbSignal.data});

                /**
                 * Main summary report, although here it could be partial
                 * (as an exit command could occur at any time)
                 */
                if ((setup.tasks.valid.length * 2) !== reports.length) {
                    prepared.reportFn({
                        type: ReportTypes.Summary,
                        data: {
                            errors,
                            sequence: decoratedSequence,
                            cli: prepared.cli,
                            config: prepared.config,
                            runtime: 1000
                        }
                    } as SummaryReport);
                }
            });

        // todo, figure out why this delay is needed
        runSubscription.takeUntil(exitSignal.delay(1)).subscribe();
    }

    if (parsed.cli.command === 'tasks' || parsed.cli.command === 'ls') {
        handleIncoming<TasksCommandComplete>(prepared)
            .subscribe();
    }

    if (parsed.cli.command === 'docs') {
        handleIncoming<DocsCommandComplete>(prepared)
            .subscribe(x => {
                if (x.errors.length) {
                    return process.exit(1);
                }
                x.output.forEach(function (outputItem: DocsFileOutput) {
                    file.writeFileToDisk(outputItem.file, outputItem.content);
                });
            })
    }

    if (parsed.cli.command === 'init') {
        handleIncoming<InitCommandComplete>(prepared)
            .subscribe(x => {
                if (x.errors.length) {
                    return process.exit(1);
                }
                writeFileSync(x.outputFilePath, readFileSync(x.templateFilePath));
            });
    }

    if (parsed.cli.command === 'watchers') {
        handleIncoming<WatchersCommandComplete>(prepared)
            .subscribe(x => {
                if (x.errors.length) {
                    return process.exit(1);
                }
            });
    }

    if (parsed.cli.command === 'watch') {
        handleIncoming<WatchCommmandComplete>(prepared)
            .subscribe(x => {
                if (x.type === WatchCommandEventTypes.SetupError) {
                    const data = <WatchCommandSetup>x.data;
                    if (data.errors.length) {
                        process.exit(1);
                    }
                }
            });
    }
}
