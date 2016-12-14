
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
import {TaskReport, TaskReportType} from "./task.runner";
import * as seq from "./task.sequence";
import * as reports from "./reporter.resolve";

const debug = require('debug')('cb:command.watch');
const _ = require('../lodash.custom');

export interface CrossbowError extends Error {
    _cb: boolean
}

export interface WatchCommandSetupErrors {
    type: ReportTypes
}

export interface WatchCommandOutput {
    setup: WatchCommandSetup
    update$: Rx.Observable<WatchReport>
}
export interface WatchCommandSetup {
    beforeTasks?:  BeforeTasks
    watchTasks?:   WatchTasks
    watchRunners?: WatchRunners
    errors:        WatchCommandSetupErrors[]
}

export type WatchCommmandComplete = Rx.Observable<WatchCommandOutput>;

export interface WatchReport {
    type: WatchCommandEventTypes,
    data: WatchTaskReport|WatchRunnerComplete
}

export enum WatchCommandEventTypes {
    SetupError           = <any>'SetupError',
    FileEvent            = <any>'FileEvent',
    WatchTaskReport      = <any>'WatchTaskReport',
    WatchRunnerComplete  = <any>'WatchRunnerComplete',
    BeforeTasksComplete  = <any>'BeforeTasksComplete'
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
            setup: {
                watchTasks,
                watchRunners: watchRunners,
                beforeTasks: beforeTasks,
                errors: [{type: ReportTypes.BeforeWatchTaskErrors, data: {watchTasks, trigger}}]
            },
            update$: <any>Rx.Observable.empty()
        });
    }

    /**
     * Never continue if any tasks were flagged as
     * // todo, how do we get here
     */
    if (watchTasks.invalid.length) {
        reporter({type: ReportTypes.WatchTaskErrors, data: {watchTasks: watchTasks.all, cli, input}});
        return Rx.Observable.just({
            setup: {
                watchTasks,
                watchRunners: watchRunners,
                beforeTasks: beforeTasks,
                errors: [{type: ReportTypes.WatchTaskErrors, data: {watchTasks, trigger}}]
            },
            update$: <any>Rx.Observable.empty()
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
            setup: {
                watchTasks,
                watchRunners: watchRunners,
                beforeTasks: beforeTasks,
                errors: [{type: ReportTypes.WatchTaskTasksErrors}]
            },
            update$: <any>Rx.Observable.empty()
        });
    }

    /**
     * If there are no before tasks to execute, just begin the watchers
     */
    if (!beforeTasks.tasks.valid.length) {
        reporter({type: ReportTypes.Watchers, data: {watchTasks: watchTasks.valid, config}});
        return Rx.Observable.just({
            setup: {
                watchTasks,
                watchRunners: watchRunners,
                beforeTasks: beforeTasks,
                errors: []
            },
            update$: createObservablesForWatchers(watchRunners.valid, trigger)
        });
    }

    reporter({type: ReportTypes.BeforeTaskList, data: {sequence: beforeTasks.sequence, cli, config: trigger.config}});

    const withBefore$ = Rx.Observable.zip(
            /**
             * Timestamp the beginning
             */
            Rx.Observable.just(true).timestamp(config.scheduler).map(x => x.timestamp),
            /**
             * Run the tasks
             */
            beforeTasks.runner.series().toArray().timestamp(config.scheduler),
            /**
             * Combine the start time + report from the runner
             */
            (start: number, x: {value: TaskReport[], timestamp: number}) => {
                const reports = x.value;
                const endtime = x.timestamp;
                return {duration: endtime - start, reports};
            })
        /**
         * At this point, before tasks have executed and we have
         * access to all task reports + run duration
         */
        .flatMap((x: {duration: number, reports: TaskReport[]}) => {

            const {duration, reports}  = x;
            const sequence = seq.decorateSequenceWithReports(beforeTasks.sequence, reports);
            const errors   = reports.filter(x => x.type === TaskReportType.error);

            reporter({
                type: ReportTypes.BeforeTasksSummary,
                data: {
                    sequence: sequence,
                    cli,
                    config,
                    runtime: duration,
                    errors
                }
            });

            const beforeReport = {
                type: WatchCommandEventTypes.BeforeTasksComplete,
                data: {
                    reports,
                    errors
                }
            };

            /**
             * If an error occurred, and the user did not provide --no-fail flag
             * don't continue with the watchers
             */
            if (errors.length && config.fail) {
                return Rx.Observable.just(beforeReport);
            }

            /**
             * Report running watchers
             */
            reporter({type: ReportTypes.Watchers, data: {watchTasks: watchTasks.valid, config}});

            /**
             * Send the before report followed by the following watch task reports
             */
            return Rx.Observable.concat<any>(
                Rx.Observable.just(beforeReport),
                createObservablesForWatchers(watchRunners.valid, trigger)
            )
        });

    return Rx.Observable.just({
        setup: {
            watchTasks,
            watchRunners: watchRunners,
            beforeTasks: beforeTasks,
            errors: []
        },
        update$: <any>withBefore$
    });
}

export default function handleIncomingWatchCommand(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration, reporter: CrossbowReporter): WatchCommmandComplete {

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
    function enterInteractive(): WatchCommmandComplete {
        if (!topLevelWatchers.length) {
            reporter({type: ReportTypes.NoWatchersAvailable});
            return Rx.Observable.just({
                setup: {
                    errors: [{type: ReportTypes.NoWatchersAvailable}]
                },
                update$: <any>Rx.Observable.empty()
            });
        }
        reporter({type: ReportTypes.NoWatchTasksProvided});
        return promptForWatchCommand(cli, input, config)
            .flatMap(function (answers) {
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
    // todo - resolve parent+child for watchers
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
