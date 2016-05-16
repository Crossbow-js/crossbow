/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {CrossbowInput, Meow} from './index';
import {WatchTaskRunner, createWatchRunners} from "./watch.runner";
import * as reporter from './reporters/defaultReporter';
import {TaskReport} from "./task.runner";
import {resolveWatchTasks} from './watch.resolve';
import {getModifiedWatchContext} from "./watch.shorthand";
import {getBeforeTaskRunner, BeforeTasks} from "./watch.before";
import * as seq from "./task.sequence";
import Rx = require('rx');
import Immutable = require('immutable');
import {createObservablesForWatchers} from "./watch.file-watcher";
import {SequenceItem} from "./task.sequence.factories";
import {isReport} from "./task.utils";
import promptForWatchCommand from "./command.watch.interactive";
import {stripBlacklisted} from "./watch.utils";

const debug = require('debug')('cb:command.watch');
const merge = require('../lodash.custom').merge;
const assign = require('object-assign');

export interface CrossbowError extends Error {
    _cb: boolean
}

export default function execute(trigger: CommandTrigger): WatchTaskRunner|{watcher$:any,tracker$:any} {

    const {cli, input, config} = trigger;

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
     * Never continue if any of the BEFORE tasks were flagged as invalid
     */
    const before = getBeforeTaskRunner(cli, trigger, watchTasks);

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
     * Never continue if any tasks were flagged as
     */
    if (watchTasks.invalid.length) {
        reporter.reportWatchTaskErrors(watchTasks.all, cli, input);
        return;
    }

    /**
     *
     */
    if (before.tasks.invalid.length) {
        reporter.reportBeforeWatchTaskErrors(watchTasks, trigger);
        return;
    }

    /**
     * Never continue if any runners are invalid
     */
    if (runners.invalid.length) {
        runners.valid.forEach(runner => {
            reporter.reportWatchTaskTasksErrors(runner._tasks.all, runner, config)
        });
        runners.invalid.forEach(runner => {
            reporter.reportWatchTaskTasksErrors(runner._tasks.all, runner, config)
        });
        return;
    }

    /**
     *
     */
    if (before.tasks.valid.length) {
        reporter.reportBeforeTaskList(before.sequence, cli, trigger.config);
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
        createBeforeRunner(before).do(() => reporter.reportWatchers(watchTasks.valid, config)),
        createObservablesForWatchers(runners.valid, trigger)
            .catch(err => {
            // Only intercept Crossbow errors
            // otherwise just allow it to be thrown
            // For example, 'before' runner may want
            // to terminate the stream, but not with a throwable
            if (err._cb) {
                return Rx.Observable.empty();
            }
            return Rx.Observable.throw(err);
        })).share();

    watcher$.subscribe();

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
        const report = (seq: SequenceItem[]) => reporter.reportSummary(seq, cli, 'Before tasks Total:', trigger.config, new Date().getTime() - beforeTimestamp);

        return before
            .runner
            .series()
            .do(report => {
                if (trigger.config.progress) {
                    reporter.taskReport(report, trigger);
                }
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
                    reporter.reportBeforeTasksDidNotComplete(cberror);
                    cberror._cb = true;
                    return Rx.Observable.throw(cberror);
                }
                return Rx.Observable.just(incoming);
            });
    }
}

export function handleIncomingWatchCommand(cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {

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
            reporter.reportNoWatchersAvailable();
            return;
        }
        reporter.reportNoWatchTasksProvided();
        return promptForWatchCommand(cli, input, config).then(function (answers) {
            const cliMerged = merge({}, cli, {input: answers.watch});
            return execute({
                shared: sharedMap,
                cli: cliMerged,
                input,
                config,
                type: TriggerTypes.watcher
            });
        });
    }

    return execute(getModifiedWatchContext({
        shared: sharedMap,
        cli,
        input,
        config,
        type: TriggerTypes.watcher
    }));
}
