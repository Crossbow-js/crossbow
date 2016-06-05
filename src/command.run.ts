/// <reference path="../typings/main.d.ts" />
import {isReport} from "./task.utils";
const debug = require('debug')('cb:command.run');
import Rx = require('rx');
const merge = require('../lodash.custom').merge;

import {CLI, CrossbowInput} from './index';
import {CrossbowConfiguration} from './config';
import {resolveTasks, TaskRunModes, maybeTaskNames} from './task.resolve';
import {TaskRunner, TaskReport} from './task.runner';
import Immutable = require('immutable');

import * as seq from "./task.sequence";
import * as reporter from './reporters/defaultReporter';
import promptForRunCommand from './command.run.interactive';
import {Tasks} from "./task.resolve.d";
import {SequenceItem} from "./task.sequence.factories";
import {Runner} from "./runner";
import {writeFileSync} from 'fs';
import {join} from 'path';

export interface CommandTrigger {
    type: TriggerTypes
    cli: CLI
    input: CrossbowInput
    config: CrossbowConfiguration
    tracker?: any
    tracker$?: any
    shared?: Rx.BehaviorSubject<Immutable.Map<string, any>>
}

export enum TriggerTypes {
    command = <any>"command",
    watcher = <any>"watcher",
}

export enum RunCommandReportTypes {
    InvalidTasks = <any>"InvalidTasks",
    Complete = <any>"Complete"
}

export interface RunCommandErrorReport {
    type: RunCommandReportTypes
    tasks: Tasks,
    sequence: SequenceItem[]
    runner: Runner
}

export interface RunCommandCompletionReport extends RunCommandErrorReport {
    type: RunCommandReportTypes
    reports: TaskReport[]
    decoratedSequence: SequenceItem[]
}

type RunCommandErrorStream = RunCommandErrorReport|Error;

function getRunCommandSetup (trigger) {
    const cliInput = trigger.cli.input.slice(1);

    /**
     * Task Tracker for external observers
     * @type {Subject<T>}
     */
    trigger.tracker = new Rx.Subject();
    trigger.tracker$ = trigger.tracker.share();

    /**
     * First Resolve the task names given in input.
     */
    const tasks = resolveTasks(cliInput, trigger);
    const topLevelParallel = tasks.all.some(function (task) {
        return task.runMode === TaskRunModes.parallel;
    });

    /**
     * If only 1 task is being run, check if any sub-tasks
     * are trying to be run in parallel mode and if so, set the runMode
     * This is done to ensure if a child errors, it doesn't affect children.
     * (as it's only a single task via the cli, it wouldn't be expected)
     */
    if (cliInput.length === 1 && topLevelParallel) {
        trigger.config.runMode = TaskRunModes.parallel;
    }

    /**
     * All this point, all given task names have been resolved
     * to either modules on disk, or @adaptor tasks, so we can
     * go ahead and create a flattened run-sequence
     */
    const sequence = seq.createFlattenedSequence(tasks.valid, trigger);

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
    return {tasks, sequence, runner};
}

export default function execute(trigger: CommandTrigger): Rx.Observable<RunCommandErrorStream|RunCommandCompletionReport> {

    const {cli, input, config} = trigger;
    const {tasks, sequence, runner} = getRunCommandSetup(trigger);

    if (trigger.config.dump) {
        writeFileSync(join(trigger.config.cwd, `_tasks.json`), JSON.stringify(tasks, null, 2));
        writeFileSync(join(trigger.config.cwd, `_sequence.json`), JSON.stringify(sequence, null, 2));
        writeFileSync(join(trigger.config.cwd, `_config.json`), JSON.stringify(trigger.config, null, 2));
    }

    /**
     * Never continue if any tasks were flagged as invalid and we've not handed
     * off
     */
    if (tasks.invalid.length) {
        reporter.reportTaskErrors(tasks.all, cli.input.slice(1), input, config);
        return Rx.Observable.concat<RunCommandErrorStream>(
            Rx.Observable.just(<RunCommandErrorReport>{
                type: RunCommandReportTypes.InvalidTasks,
                tasks,
                sequence,
                runner,
                name: 'shame'
            }),
            Rx.Observable.throw(new Error(`RunCommandErrorTypes.InvalidTasks`))
        );
    }

    debug(`~ run mode from config in mode: '${config.runMode}'`);

    /**
     * Report task list that's about to run
     */
    reporter.reportTaskList(sequence, cli, '', config);

    /**
     * A generic timestamp to mark the beginning of the tasks
     * @type {number}
     */
    const timestamp = new Date().getTime();
    const complete$ = new Rx.Subject<RunCommandCompletionReport>();

    const run$ = runner[trigger.config.runMode]
        .call()
        .do(report => trigger.tracker.onNext(report))
        .do((x: TaskReport) => {
            if (trigger.config.progress) {
                reporter.taskReport(x, trigger);
            }
        })
        .toArray()
        .share();

    run$
        .do(reports => {
            const decoratedSequence = seq.decorateSequenceWithReports(sequence, reports);
            complete$.onNext({type: RunCommandReportTypes.Complete, reports, tasks, sequence, runner, decoratedSequence});
            complete$.onCompleted();
            reporter.reportSummary(decoratedSequence, cli, 'Total: ', config, new Date().getTime() - timestamp);
        })
        .subscribe(_ => {

        }, e => {
            // Task running should never reach here
            if (e.stack) {
                console.error(e.stack);
            } else {
                console.log(e);
            }
        }, _ => {
            debug('All tasks finished');
        });

    return complete$;
}

export function handleIncomingRunCommand(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration):any {

    /**
     * Array of top-level task names that are available
     */
    const topLevelTasks = Object.keys(input.tasks);

    /**
     * The shared Map that tasks can read/write to
     */
    const sharedMap     = new Rx.BehaviorSubject(Immutable.Map({}));

    const type = TriggerTypes.command;
    
    debug('top level tasks available', topLevelTasks);

    if (config.handoff) {
        return getRunCommandSetup({
            shared: sharedMap,
            cli,
            input,
            config,
            type
        });
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
        return promptForRunCommand(cli, input, config).subscribe(function (answers) {
            const cliMerged = merge({}, cli, {input: ['run', ...answers.tasks]});
            const configMerged = merge({}, config, {runMode: TaskRunModes.parallel});
            return execute({
                shared: sharedMap,
                cli: cliMerged,
                input,
                config: configMerged,
                type
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
        type
    });
}

