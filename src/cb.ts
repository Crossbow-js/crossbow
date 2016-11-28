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
     * Any errors found on input preparation
     * will be sent to the output observer and
     * requires no further work other than to exit
     * with a non-zero code
     */
    if (prepared.errors.length) {
        return process.exit(1);
    }

    if (parsed.cli.command === 'run') {

        const run               = handleIncoming<RunComplete>(prepared);
        const reports           = [];
        const {sequence, tasks} = run.runSetup;

        const subscription1     = run.update$
            .do(x => {
                const data = <TaskReport>x.data;
                reports.push(data);
            })
            .subscribe();

        cliSignalObserver
            .filter(x => x.type === SignalTypes.FileWrite)
            .subscribe((x: CBSignal<FileWriteSignal>) => {
                if (prepared.config.dryRun) {
                    // should skip / noop here
                } else {
                    file.writeFileToDisk(x.data.file, x.data.content);
                }
            });

        cliSignalObserver
            .filter(x => x.type === SignalTypes.Exit)
            .do((cbSignal: CBSignal<ExitSignal>) => {

                /**
                 * Allow the signal-sender's task to complete
                 */
                process.nextTick(function () {
                    subscription1.dispose();
                });

                /**
                 * Merge sequence tree with Task Reports
                 */
                const decoratedSequence = seq.decorateSequenceWithReports(sequence, reports);

                /**
                 * Did any errors occur in this run?
                 * @type {TaskReport[]}
                 */
                const errors = reports.filter(x => x.type === TaskReportType.error);

                prepared.reportFn({
                    type: ReportTypes.SignalReceived,
                    data: cbSignal.data
                });

                /**
                 * Main summary report
                 */
                prepared.reportFn({
                    type: ReportTypes.Summary,
                    data: {
                        errors: errors,
                        sequence: decoratedSequence,
                        cli: prepared.cli,
                        config: prepared.config,
                        runtime: 0
                    }
                } as SummaryReport);

            }).subscribe();
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
