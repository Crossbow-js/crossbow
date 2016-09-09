/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {CrossbowInput, CLI, CrossbowReporter} from './index';
import {WatchTaskRunner, createWatchRunners} from "./watch.runner";
import {TaskReport} from "./task.runner";
import {resolveWatchTasks} from './watch.resolve';
import {getModifiedWatchContext} from "./watch.shorthand";
import {getBeforeTaskRunner, BeforeTasks} from "./watch.before";
import * as seq from "./task.sequence";
import Rx = require('rx');
import Immutable = require('immutable');
import {createObservablesForWatchers} from "./watch.file-watcher";
import {SequenceItem} from "./task.sequence.factories";
import promptForWatchCommand from "./command.watch.interactive";
import {stripBlacklisted} from "./watch.utils";
import {ReportNames} from "./reporter.resolve";
import {BeforeWatchTaskErrorsReport} from "./reporters/defaultReporter";

const debug = require('debug')('cb:command.watch');
const _ = require('../lodash.custom');

export interface CrossbowError extends Error {
    _cb: boolean
}

function execute(trigger: CommandTrigger): WatchTaskRunner|{watcher$:any,tracker$:any} {

    const {cli, input, config, reporter} = trigger;

    /**
     * task Tracker for external observers
     * @type {Subject<T>}
     */
    trigger.tracker = new Rx.Subject();
    trigger.tracker$ = trigger.tracker.share();

    debug(`Working with input [${trigger.cli.input}]`);

    /**
     * First Resolve the task names given in input.
     */
    const watchTasks = resolveWatchTasks(trigger.cli.input, trigger);

    debug(`${watchTasks.valid.length} valid task(s)`);
    debug(`${watchTasks.invalid.length} invalid task(s)`);

    /**
     * Create runners for watch tasks;
     */
    const runners = createWatchRunners(watchTasks, trigger);

    /**
     * Get a special runner that will execute before
     * watchers begin
     * @type {BeforeTasks}
     */
    const before = getBeforeTaskRunner(trigger, watchTasks);

    /**
     * Check if the user intends to handle running the tasks themselves,
     * if that's the case we give them the resolved tasks along with
     * the sequence and the primed runner
     */
    if (config.handoff) {
        debug(`Handing off Watchers`);
        return {tasks: watchTasks, runners, before};
    }

    debug(`Not handing off, will handle watching internally`);

    /**
     * Never continue if any BEFORE tasks were flagged as invalid
     */
    if (before.tasks.invalid.length) {
        reporter({type: ReportNames.BeforeWatchTaskErrors, data: {watchTasks, trigger}} as BeforeWatchTaskErrorsReport);
        return;
    }

    /**
     * Never continue if any tasks were flagged as
     * // todo, how do we get here
     */
    if (watchTasks.invalid.length) {
        reporter({type: ReportNames.WatchTaskErrors, data: {watchTasks: watchTasks.all, cli, input}});
        return;
    }


    /**
     * Never continue if any runners are invalid
     */
    if (runners.invalid.length) {
        // it doesn't make any sense to log 'valid' tasks with
        // WatchTaskTasksErrors - either don't log them, or use a more appropriate name
        // runners.valid.forEach(runner => {
        //     reporter(ReportNames.WatchTaskTasksErrors, runner._tasks.all, runner, config)
        // });
        runners.invalid.forEach(runner => {
            reporter({type: ReportNames.WatchTaskTasksErrors, data: {tasks: runner._tasks.all, runner, config}});
        });
        return;
    }

    /**
     * List the tasks that must complete before any watchers begin
     */
    if (before.tasks.valid.length) {
        reporter({type: ReportNames.BeforeTaskList, data: {sequence: before.sequence, cli, config: trigger.config}});
    }

    /**
     * To begin the watchers, we first create a runner for the 'before' tasks.
     * If this completes (tasks complete or return true) then we continue
     * to create the file-watchers and hook up the tasks
     */
    const watcher$ = Rx.Observable.concat(
        /**
         * The 'before' runner can be `true`, complete, or throw.
         * If it throws, the login in the `do` block below will not run
         * and the watchers will not begin
         */
        createBeforeRunner(before)
            .catch(err => {
                // Only intercept Crossbow errors
                // otherwise just allow it to be thrown
                // For example, 'before' runner may want
                // to terminate the stream, but not with a throwable
                if (err._cb) {
                    sub.dispose();
                    return Rx.Observable.empty();
                }
                return Rx.Observable.throw(err);
            })
            .do(() => {
                reporter({type: ReportNames.Watchers, data: {watchTasks: watchTasks.valid, config}});
            }),
        createObservablesForWatchers(runners.valid, trigger)).share();

    const sub = watcher$.subscribe();

    return {
        watcher$,
        tracker$: trigger.tracker$
    };

    /**
     * Return an Observable that's either
     * 1. a simple boolean (no before tasks),
     * 2. a throw (which means there was some error, so watchers should not begin)
     * 3. a sequence representing a runner (which will then wait until complete)
     */
    function createBeforeRunner(before: BeforeTasks): Rx.Observable<any> {

        if (!before.beforeTasksAsCliInput.length) {
            return Rx.Observable.just(true);
        }

        if (before.tasks.invalid.length) {
            return Rx.Observable.throw(new Error('Before task resolution failed'));
        }

        /**
         * A generic timestamp to mark the beginning of the tasks
         * @type {number}
         */
        const beforeTimestamp = new Date().getTime();
        const report = (seq: SequenceItem[]) => {
            reporter({type: ReportNames.Summary, data: {
                sequence: seq,
                cli,
                title: 'Before tasks Total:',
                config: trigger.config,
                runtime: new Date().getTime() - beforeTimestamp
            }});
        }

        return before
            .runner
            .series()
            .do(report => {
                reporter({type: ReportNames.TaskReport, data: {report, trigger}});
            })
            .toArray()
            .flatMap((reports: TaskReport[]) => {
                const incoming = seq.decorateSequenceWithReports(before.sequence, reports);
                const errorCount = seq.countSequenceErrors(incoming);
                report(incoming);
                if (errorCount > 0) {
                    /**
                     * If we reach here, the 'before' task sequence did not complete
                     * so we `throw` here to ensure the upstream fails
                     */
                    const cberror = <CrossbowError>new Error('Before tasks did not complete!');
                    reporter({type: ReportNames.BeforeTasksDidNotComplete, data: {error: cberror}});
                    cberror._cb = true;
                    return Rx.Observable.throw(cberror);
                }
                return Rx.Observable.just(incoming);
            });
    }
}

export default function handleIncomingWatchCommand(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration, reporter: CrossbowReporter) {

    const topLevelWatchers = stripBlacklisted(Object.keys(input.watch));

    debug('top level watchers available', topLevelWatchers);

    const sharedMap = new Rx.BehaviorSubject(Immutable.Map({}));

    /**
     * If the interactive flag was given (-i), always try
     * that first.
     */
    if (config.interactive) {
        return enterInteractive();
    }

    /**
     * If the user did not provide a watcher name
     */
    if (cli.input.length === 1) {
        if (input.watch.default !== undefined) {
            const moddedCliInput = cli.input.slice();
            cli.input = moddedCliInput.concat('default');
            return execute(getModifiedWatchContext({
                shared: sharedMap,
                cli,
                input,
                config,
                reporter,
                type: TriggerTypes.watcher
            }));
        }

        return enterInteractive();
    }

    /**
     * If no watchers given, or if user has selected interactive mode,
     * show the UI for watcher selection
     */
    function enterInteractive() {
        if (!topLevelWatchers.length) {
            reporter({type: ReportNames.NoWatchersAvailable});
            return;
        }
        reporter({type: ReportNames.NoWatchTasksProvided});
        return promptForWatchCommand(cli, input, config).then(function (answers) {
            const cliMerged = _.merge({}, cli, {input: answers.watch});
            return execute({
                shared: sharedMap,
                cli: cliMerged,
                input,
                config,
                reporter,
                type: TriggerTypes.watcher
            });
        });
    }

    return execute(getModifiedWatchContext({
        shared: sharedMap,
        cli,
        input,
        config,
        reporter,
        type: TriggerTypes.watcher
    }));
}
