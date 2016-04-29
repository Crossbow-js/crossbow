/// <reference path="../typings/main.d.ts" />
import {isReport} from "./task.utils";
const debug = require('debug')('cb:command.run');
import Rx = require('rx');
const merge = require('lodash.merge');

import {Meow, CrossbowInput} from './index';
import {CrossbowConfiguration} from './config';
import {resolveTasks, TaskRunModes} from './task.resolve';
import {TaskRunner, TaskReport} from './task.runner';
import Immutable = require('immutable');

import * as seq from "./task.sequence";
import * as reporter from './reporters/defaultReporter';
import promptForRunCommand from './command.run.interactive';

export interface CommandTrigger {
    type: 'command' | 'watcher'
    cli: Meow
    input: CrossbowInput
    config: CrossbowConfiguration
    tracker?: any
    tracker$?: any
    shared: Rx.BehaviorSubject<Immutable.Map<string, any>>
}

export default function execute(trigger: CommandTrigger): TaskRunner {
    const cliInput = trigger.cli.input.slice(1);
    const {cli, input, config} = trigger;

    /**
     * task Tracker for external observers
     * @type {Subject<T>}
     */
    trigger.tracker = new Rx.Subject();
    trigger.tracker$ = trigger.tracker
        .filter(isReport)
        .share();

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

    /**
     * If we've reached this point, we're going to handle running
     * the tasks! This api should be exactly what we expect users
     * to consume. We use the `config.runMode` flag to select a top-level
     * parallel or series runner
     */
    runner[config.runMode]
        .call()
        .do(trigger.tracker)
        /**
         * Now dicard anything that is not a start/error/begin event
         */
        .filter(isReport)
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
     * If no task given, or if user has selected interactive mode,
     * show the UI for task selection
     */
    if (cli.input.length === 1 || config.interactive) {
        if (cli.input.length === 1 && Object.keys(input.tasks).length) {
            reporter.reportNoTasksProvided();
            return promptForRunCommand(cli, input, config).then(function (answers) {
                const cliMerged = merge({}, cli, {input: ['run', ...answers.tasks]});
                const configMerged = merge({}, config, {runMode: TaskRunModes.parallel});
                return execute({
                    shared: new Rx.BehaviorSubject(Immutable.Map({})),
                    cli: cliMerged,
                    input,
                    config: configMerged,
                    type: 'command'
                });
            });
        } else {
            reporter.reportNoTasksAvailable();
            return;
        }
    }

    return execute({
        shared: new Rx.BehaviorSubject(Immutable.Map({})),
        cli,
        input,
        config,
        type: 'command'
    });
}

