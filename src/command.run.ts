/// <reference path="../typings/main.d.ts" />
const debug  = require('debug')('cb:command.run');
const Rx     = require('rx');
const merge  = require('lodash.merge');

import {TaskRunner} from './task.runner';
import {Meow, CrossbowInput} from './index';
import {CrossbowConfiguration} from './config';
import {resolveTasks} from './task.resolve';
import {TaskReport} from "./task.runner";
import {createRunner, createFlattenedSequence, decorateCompletedSequenceItems} from './task.sequence';
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
    const runner$ = runner[config.runMode]
        .call()
        /**
         * We look at every error received from any task - if 'config.fail'
         * is true, then we can simply exit the process (as the stack
         * will have already been printed)
         */
        .catch(function (e) {
            if (e._cbStack) {
                console.log(e._cbStack);
            } else {
                console.log(e.stack);
            }
            if (config.fail === true) {
                //return process.exit(1);
            }
            return Rx.Observable.empty();
        }).share();

    /**
     * Here, we start the tasks
     */
    runner$
        /**
         * This is the opportunity to capture every single event
         * that could possibly come from a task:
         *   eg: start, end, log, file etc etc etc
         */
        .do((tr: TaskReport) => {
            //console.log('event', tr.type, 'TASK UID', tr.item.seqUID);
        })
        /**
         * but now, we only care about task events that signal a task has ended
         */
        //.where((tr: TaskReport) => tr.type === 'end')
        /**
         * ... and then we aggregate all of those together into an array. This is done
         * to allow the 'onNext' callback to instead be used as a completion handler -
         * with the added benefit being that we'll receive all events as as an array
         * without having to use any external array and pushing items into it.
         */
        .toArray()
        /**
         * Now we subscribe, which starts the task sequence.
         * Because we used toArray() above, the subscribe method
         * below will only ever receive a single event - which
         * is ok because we've had the opportunity above to do
         * things such as logging etc
         */
        .subscribe((trs: TaskReport[]) => {
            /**
             * Link the stats to the sequence item
             */
            const decoratedSequence = decorateCompletedSequenceItems(sequence, trs);
            reportSummary(decoratedSequence, cli, input, config, new Date().getTime() - timestamp);
            if (trs[trs.length-1].stats.errors.length && config.fail) {
                debug('Exiting with exit code 1 because the last task that ran did an error');
                return process.exit(1);
            }
        }, (err) => {
            //console.log('GOT ERROR');
            throw err;
        }); // completion callback not needed - if the onNext callback fires, everything completed

    ///**
    // * The subscription to kick-start everything
    // */
    //runner$.subscribeOnCompleted(function () {
    //    reportSummary(sequence, cli, input, config, new Date().getTime() - timestamp);
    //	// todo: reporter: handle completion here.
    //})
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

