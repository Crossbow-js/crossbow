/// <reference path="../typings/main.d.ts" />
import {isReport} from "./task.utils";
const debug = require('debug')('cb:command.run');
import Rx = require('rx');
const merge = require('lodash.merge');

import {Meow, CrossbowInput} from './index';
import {CrossbowConfiguration} from './config';
import {resolveTasks, TaskRunModes, maybeTaskNames} from './task.resolve';
import {TaskRunner, TaskReport} from './task.runner';
import Immutable = require('immutable');

import * as seq from "./task.sequence";
import * as reporter from './reporters/defaultReporter';
import promptForRunCommand from './command.run.interactive';

export interface CommandTrigger {
    type: TriggerTypes
    cli: Meow
    input: CrossbowInput
    config: CrossbowConfiguration
    tracker?: any
    tracker$?: any
    shared: Rx.BehaviorSubject<Immutable.Map<string, any>>
}

export enum TriggerTypes {
    command = <any>"command",
    watcher = <any>"watcher",
}

export default function execute(trigger: CommandTrigger): TaskRunner {
    const cliInput = trigger.cli.input.slice(1);
    const {cli, input, config} = trigger;

    /**
     * task Tracker for external observers
     * @type {Subject<T>}
     */
    trigger.tracker = new Rx.Subject();
    trigger.tracker$ = trigger.tracker.share();

    /**
     * First Resolve the task names given in input.
     */
    const tasks = resolveTasks(cliInput, trigger);

    // require('fs').writeFileSync('tasks.json', JSON.stringify(tasks, null, 4));

    /**
     * All this point, all given task names have been resolved
     * to either modules on disk, or @adaptor tasks, so we can
     * go ahead and create a flattened run-sequence
     */
    const sequence = seq.createFlattenedSequence(tasks.valid, trigger);

    // require('fs').writeFileSync('sequence.json', JSON.stringify(sequence, null, 4));

    /**
     * With the flattened sequence, we can create nested collections
     * of Rx Observables
     */
    const runner = seq.createRunner(sequence, trigger);

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
        reporter.reportTaskErrors(tasks.all, cli.input.slice(1), input, config);
        return;
    }

    debug(`~ run mode from CLI '${config.runMode}'`);

    /**
     * Report task list that's about to run
     */
    reporter.reportTaskList(sequence, cli, '', config);

    /**
     * A generic timestamp to mark the beginning of the tasks
     * @type {number}
     */
    const timestamp = new Date().getTime();

    runner[trigger.config.runMode]
        .call()
        .do(report => trigger.tracker.onNext(report))
        .do((x: TaskReport) => {
            if (trigger.config.progress) {
                reporter.taskReport(x, trigger);
            }
        })
        .toArray()
        .subscribe((reports: TaskReport[]) => {
            const decoratedSequence = seq.decorateSequenceWithReports(sequence, reports);
            reporter.reportSummary(decoratedSequence, cli, 'Total: ', config, new Date().getTime() - timestamp);
        }, e => {
            // never gunna get here baby
        }, _ => {
            debug('All tasks finished');
        })
}

export function handleIncomingRunCommand(cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {

    /**
     * Array of top-level task names that are available
     */
    const topLevelTasks = Object.keys(input.tasks);

    /**
     * The shared Map that tasks can read/write to
     */
    const sharedMap     = new Rx.BehaviorSubject(Immutable.Map({}));

    debug('top level tasks available', topLevelTasks);

    /**
     * If only 1 task provided, such as
     *  $ crossbow run build-all
     *  -> always run in parallel mode (to stop errors from affecting children
     */
    if (cli.input.length === 2) {
        debug('Setting config.runMode = parallel');
        config.runMode = TaskRunModes.parallel;
    }

    /**
     * If the interactive flag was given (-i), always try
     * that first.
     */
    if (config.interactive) {
        return enterInteractive();
    }

    /**
     * If the user never provided a task then we either look
     * for a `default` task or enter interactive mode if possible
     * eg:
     *  $ crossbow run
     */
    if (cli.input.length === 1) {

        /**
         * First look if there's a 'default' task defined
         */
        if (hasDefaultTask()) {
            const cliMerged = merge({}, cli, {input: ['run', 'default']});
            return execute({
                shared: sharedMap,
                cli: cliMerged,
                input,
                config,
                type: TriggerTypes.command
            });
        }

        /**
         * If no default task was found above, enter interactive mode
         */
        return enterInteractive();
    }

    /**
     * Check if the provided input contains either
     * 'default' or 'default@p' etc
     */
    function hasDefaultTask () {
        if (maybeTaskNames(input.tasks, 'default').length) {
            return true;
        }
        if (input.tasks['default'] !== undefined) {
            return true;
        }
    }

    /**
     * If no task given, or if user has selected interactive mode,
     * show the UI for task selection
     */
    function enterInteractive() {
        if (!topLevelTasks.length) {
            reporter.reportNoTasksAvailable();
            return;
        }
        reporter.reportNoTasksProvided();
        return promptForRunCommand(cli, input, config).then(function (answers) {
            const cliMerged = merge({}, cli, {input: ['run', ...answers.tasks]});
            const configMerged = merge({}, config, {runMode: TaskRunModes.parallel});
            return execute({
                shared: sharedMap,
                cli: cliMerged,
                input,
                config: configMerged,
                type: TriggerTypes.command
            });
        });
    }

    /**
     * If we reach here we're dealing with the default case
     * where we are simply executing the command as normal
     * eg:
     *  $ crossbow run task1 task2@p etc ...
     */
    return execute({
        shared: sharedMap,
        cli,
        input,
        config,
        type: TriggerTypes.command
    });
}

