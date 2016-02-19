/// <reference path="../typings/main.d.ts" />
const debug = require('debug')('cb:command.run');
const Rx    = require('rx');

import {TaskRunner} from './task.runner';
import {Meow, CrossbowInput} from './index';
import {CrossbowConfiguration} from './config';
import {resolveTasks} from './task.resolve';
import {createRunner, createFlattenedSequence} from './task.sequence';
import {summary, reportTaskList, reportTaskErrors} from './reporters/defaultReporter';

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
        // todo output error summary
        reportTaskErrors(tasks.invalid, cli, input, config);
        return;
    }

    debug(`~ run mode from CLI '${config.runMode}'`);

    //reportTaskList(sequence, cli, input, config);

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
    const runner$ = runner[config.runMode].call()
        /**
         * We look at every error received from any task - if 'exitOnError'
         * is true, then we can simply exit the process (as the stack
         * will have already been printed)
         */
        .catch(function (e) {
            console.log(e.stack);
            if (config.exitOnError === true) {
                return process.exit(1);
            }
            return Rx.Observable.empty(e);
        }).share();

    /**
     * The subscription to kick-start everything
     */
    runner$.subscribeOnCompleted(function () {
        summary(sequence, cli, input, config, new Date().getTime() - timestamp);
    	// todo: reporter: handle completion here.
    })
}

