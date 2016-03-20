/// <reference path="../typings/main.d.ts" />
const debug  = require('debug')('cb:command.run');
const Rx     = require('rx');
const merge  = require('lodash.merge');

import {TaskRunner} from './task.runner';
import {Meow, CrossbowInput} from './index';
import {CrossbowConfiguration} from './config';
import {resolveTasks} from './task.resolve';
import {TaskReport} from "./task.runner";
import {createRunner, createFlattenedSequence, decorateCompletedSequenceItemsWithReports} from './task.sequence';
import {reportSummary, reportTaskList, reportTaskErrors, reportNoTasksProvided} from './reporters/defaultReporter';
import promptForRunCommand from './command.run.interactive';

export interface CommandTrigger {
    type: string
    cli: Meow
    input: CrossbowInput
    config: CrossbowConfiguration
}

export interface RunCommandTrigger extends CommandTrigger {
    type: 'command'
}

if (process.env.DEBUG) {
    Rx.config.longStackSupport = true;
}

export default function execute (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration): TaskRunner {
    const cliInput = cli.input.slice(1);
    const ctx: RunCommandTrigger = {cli, input, config, type: 'command'};

    /**
     * First Resolve the task names given in input.
     */
    const tasks = resolveTasks(cliInput, ctx);

    /**
     * All this point, all given task names have been resolved
     * to either modules on disk, or @adaptor tasks, so we can
     * go ahead and create a flattened run-sequence
     */
    const sequence = createFlattenedSequence(tasks.valid, ctx);

    // require('fs').writeFileSync('sequence.json', JSON.stringify(sequence, null, 4));

    /**
     * With the flattened sequence, we can create nested collections
     * of Rx Observables
     */
    const runner = createRunner(sequence, ctx);

    /**
     * Check if the user intends to handle running the tasks themselves,
     * if thats the case we give them the resolved tasks along with
     * the sequence and the primed runner
     */
    if (config.handoff) {
        debug(`Handing off runner`);
        return {tasks, sequence, runner};
    }

    /**
     * Never continue if any tasks were flagged as invalid and we've not handed
     * off
     */
    if (tasks.invalid.length) {
        reportTaskErrors(tasks.all, cli.input.slice(1), input, config);
        return;
    }

    debug(`~ run mode from CLI '${config.runMode}'`);

    /**
     * Report task list that's about to run
     */
    reportTaskList(sequence, cli, '', config);

    /**
     * A generic timestamp to mark the beginning of the tasks
     * @type {number}
     */
    const timestamp = new Date().getTime();

    /**
     * If we've reached this point, we're going to handle running
     * the tasks! We use the `config.runMode` flag to select a top-level
     * parallel or series runner
     */
    runner[config.runMode]
        .call()
        .toArray()
        .subscribe((reports: TaskReport[]) => {
            // console.log(reports.map(x => x.type));
            const decoratedSequence = decorateCompletedSequenceItemsWithReports(sequence, reports);
            // console.log(reports);
            // reportSummary(decoratedSequence, cli, input, config, new Date().getTime() - timestamp);
        }, e => {
            // never gunna get here baby
        }, _ => {
            debug('All tasks finished');
        })

}

export function handleIncomingRunCommand (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {
    /**
     * If no task given, or if user has selected interactive mode,
     * show the UI for task selection
     */
    if (cli.input.length === 1 || config.interactive) {
        if (cli.input.length === 1) {
            reportNoTasksProvided();
        }
        return promptForRunCommand(cli, input, config)
            .subscribe(answers => {
                const cliMerged       = merge({}, cli, {input: ['run', ...answers.tasks]});
                const configMerged    = merge({}, config, {runMode: answers.runMode});
                return execute(cliMerged, input, configMerged);
            });
    }

    return execute(cli, input, config);
}

