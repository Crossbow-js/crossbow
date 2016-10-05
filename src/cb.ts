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
import {ExitSignal, CBSignal, SignalTypes} from "./config";
import {ReportTypes} from "./reporter.resolve";
import {TasksCommandComplete} from "./command.tasks";
import {RunComplete, RunCommandReportTypes} from "./command.run.execute";
import {TaskReport} from "./task.runner";

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

        const subscription = handleIncoming<RunComplete>(prepared);
        const reports      = [];

        const subscription1 = subscription
            .do(x => {
                if (x.type === RunCommandReportTypes.TaskReport) {
                    reports.push(x.data);
                }
                if (x.type === RunCommandReportTypes.TaskReport) {
                    require('./command.run.post-execution').postCliExecution(x);
                }
            })
            .subscribe();

        const exitSignals = cliSignalObserver
            .filter(x => x.type === SignalTypes.Exit)
            .do((cbSignal: CBSignal<ExitSignal>) => {
                subscription1.dispose();
                console.log(reports);
                cliOutputObserver.onNext({
                    origin: ReportTypes.SignalReceived,
                    data: [`{yellow:~~~} Exit Signal Received {cyan:(code: ${cbSignal.data.code})} {yellow:~~~}`]
                });
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
