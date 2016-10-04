/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {CrossbowInput, CLI, CrossbowReporter} from './index';
import {createWatchRunners, WatchRunners} from "./watch.runner";
import {resolveWatchTasks, WatchTasks} from './watch.resolve';
import {getModifiedWatchContext} from "./watch.shorthand";
import {getBeforeTaskRunner, BeforeTasks} from "./watch.before";
import Rx = require('rx');
import Immutable = require('immutable');
import {createObservablesForWatchers, WatchTaskReport, WatchRunnerComplete} from "./watch.file-watcher";
import promptForWatchCommand from "./command.watch.interactive";
import {stripBlacklisted} from "./watch.utils";
import {ReportTypes} from "./reporter.resolve";
import {BeforeWatchTaskErrorsReport} from "./reporter.resolve";

const debug = require('debug')('cb:command.watch');
const _ = require('../lodash.custom');

export interface CrossbowError extends Error {
    _cb: boolean
}

export interface WatchCommandSetupErrors {
    type: ReportTypes
}

export interface WatchCommandReport <T> {
    type: WatchCommandEventTypes
    data: T
}

export interface WatchCommandSetup {
    beforeTasks:  BeforeTasks
    watchTasks:   WatchTasks
    watchRunners: WatchRunners
    errors:       WatchCommandSetupErrors[]
}

export type WatchCommmandComplete = Rx.Observable<WatchCommandReport<WatchCommandSetup|WatchTaskReport|WatchRunnerComplete>>;

export enum WatchCommandEventTypes {
    SetupError = <any>'SetupError',
    FileEvent  = <any>'FileEvent',
    WatchTaskReport  = <any>'WatchTaskReport',
    WatchRunnerComplete  = <any>'WatchRunnerComplete',
}

function executeWatchCommand(trigger: CommandTrigger): WatchCommmandComplete {

    const {cli, input, config, reporter} = trigger;

    const {beforeTasks, watchTasks, watchRunners} = getWatchCommandSetup(trigger);

    /**
     * Never continue if any BEFORE tasks were flagged as invalid
     */
    if (beforeTasks.tasks.invalid.length) {
        reporter({type: ReportTypes.BeforeWatchTaskErrors, data: {watchTasks, trigger}} as BeforeWatchTaskErrorsReport);
        return Rx.Observable.just({
            type: WatchCommandEventTypes.SetupError,
            data:  {
                watchTasks,
                watchRunners: watchRunners,
                beforeTasks: beforeTasks,
                errors: [{type: ReportTypes.BeforeWatchTaskErrors, data: {watchTasks, trigger}}]
            }
        });
    }

    /**
     * Never continue if any tasks were flagged as
     * // todo, how do we get here
     */
    if (watchTasks.invalid.length) {
        reporter({type: ReportTypes.WatchTaskErrors, data: {watchTasks: watchTasks.all, cli, input}});
        return Rx.Observable.just({
            type: WatchCommandEventTypes.SetupError,
            data: {
                watchTasks,
                watchRunners: watchRunners,
                beforeTasks: beforeTasks,
                errors: [{type: ReportTypes.WatchTaskErrors, data: {watchTasks, trigger}}]
            }
        });
    }

    /**
     * Never continue if any runners are invalid
     */
    if (watchRunners.invalid.length) {

        watchRunners.invalid.forEach(runner => {
            reporter({type: ReportTypes.WatchTaskTasksErrors, data: {tasks: runner._tasks.all, runner, config}});
        });

        return Rx.Observable.just({
            type: WatchCommandEventTypes.SetupError,
            data: {
                watchTasks,
                watchRunners: watchRunners,
                beforeTasks: beforeTasks,
                errors: [{type: ReportTypes.WatchTaskTasksErrors}]
            }
        });
    }

    /**
     * List the tasks that must complete before any watchers begin
     */
    if (beforeTasks.tasks.valid.length) {
        reporter({type: ReportTypes.BeforeTaskList, data: {sequence: beforeTasks.sequence, cli, config: trigger.config}});
    }

    /**
     * todo: actually begin the watchers
     */
    return createObservablesForWatchers(watchRunners.valid, trigger);

    // /**
    //  * To begin the watchers, we first create a runner for the 'before' tasks.
    //  * If this completes (tasks complete or return true) then we continue
    //  * to create the file-watchers and hook up the tasks
    //  */
    // const watcher$ = Rx.Observable.concat(
    //     /**
    //      * The 'before' runner can be `true`, complete, or throw.
    //      * If it throws, the login in the `do` block below will not run
    //      * and the watchers will not begin
    //      */
    //     createBeforeRunner(before)
    //         .catch(err => {
    //             // Only intercept Crossbow errors
    //             // otherwise just allow it to be thrown
    //             // For example, 'before' runner may want
    //             // to terminate the stream, but not with a throwable
    //             if (err._cb) {
    //                 sub.dispose();
    //                 return Rx.Observable.empty();
    //             }
    //             return Rx.Observable.throw(err);
    //         })
    //         .do(() => {
    //             reporter({type: ReportTypes.Watchers, data: {watchTasks: watchTasks.valid, config}});
    //         }),
    //     createObservablesForWatchers(runners.valid, trigger)).share();
    //
    // const sub = watcher$.subscribe();
    //
    // return {
    //     watcher$,
    //     tracker$: trigger.tracker$
    // };
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
            return executeWatchCommand(getModifiedWatchContext({
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
            reporter({type: ReportTypes.NoWatchersAvailable});
            return;
        }
        reporter({type: ReportTypes.NoWatchTasksProvided});
        return promptForWatchCommand(cli, input, config).then(function (answers) {
            const cliMerged = _.merge({}, cli, {input: answers.watch});
            return executeWatchCommand({
                shared: sharedMap,
                cli: cliMerged,
                input,
                config,
                reporter,
                type: TriggerTypes.watcher
            });
        });
    }

    return executeWatchCommand(getModifiedWatchContext({
        shared: sharedMap,
        cli,
        input,
        config,
        reporter,
        type: TriggerTypes.watcher
    }));
}


export function getWatchCommandSetup (trigger: CommandTrigger): WatchCommandSetup {

    const {cli, input, config, reporter} = trigger;

    /**
     * task Tracker for external observers
     * @type {Subject<T>}
     */
    trigger.tracker  = new Rx.Subject();
    trigger.tracker$ = trigger.tracker.share();

    /**
     * First Resolve the task names given in input.
     */
    const watchTasks = resolveWatchTasks(trigger.cli.input, trigger);

    /**
     * Create runners for watch tasks;
     */
    const watchRunners = createWatchRunners(watchTasks, trigger);

    /**
     * Get a special runner that will executeWatchCommand before
     * watchers begin
     * @type {BeforeTasks}
     */
    const beforeTasks = getBeforeTaskRunner(trigger, watchTasks);

    /**
     *
     */
    return {watchRunners, watchTasks, beforeTasks, errors: []};
}
