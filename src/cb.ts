#!/usr/bin/env node
import {RunComplete} from "./command.run.execute";
import {TasksCommandComplete} from "./command.tasks";
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

const parsed = cli(process.argv.slice(2));

const cliOutputObserver = new Rx.Subject<reports.OutgoingReport>();
cliOutputObserver.subscribe(function (report) {
    report.data.forEach(function (x) {
        logger.info(x);
    });
});

if (parsed.execute) {
    runFromCli(parsed, cliOutputObserver);
}

function runFromCli (parsed: PostCLIParse, cliOutputObserver): void {

    const prepared = prepareInput(parsed.cli, null, cliOutputObserver);

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
        handleIncoming<RunComplete>(prepared)
            .subscribe(require('./command.run.post-execution').postCliExecution);
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
}
