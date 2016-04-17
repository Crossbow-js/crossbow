/// <reference path="../typings/main.d.ts" />
import {CommandTrigger} from './command.run';
import {CrossbowConfiguration} from './config';
import {CrossbowInput, Meow} from './index';
import {WatchTaskRunner, createWatchRunners} from "./watch.runner";
import * as reporter from './reporters/defaultReporter';
import {TaskReport, TaskReportType} from "./task.runner";
import {resolveWatchTasks} from './watch.resolve';
import {getContext} from "./watch.shorthand";
import {getBeforeTaskRunner} from "./watch.before";

import Rx = require('rx');
import {createObservablesForWatchers} from "./watch.file-watcher";

const debug    = require('debug')('cb:command.watch');
const merge    = require('lodash.merge');
const assign   = require('object-assign');

export interface WatchTrigger extends CommandTrigger {
    type: 'watcher'
}

export default function execute (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration): WatchTaskRunner {

    /**
     * First, allow modifications to the current context
     * (such as shorthand watchers, for instance)
     * @type {WatchTrigger}
     */
    const trigger = getContext({cli, input, config, type: 'watcher'});

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

    const tracker = new Rx.Subject();
    const tracker$ = tracker
        .filter((x: TaskReport) => {
            // todo more robust way of determining if the current value was a report from crossbow (could be a task produced value)
            return typeof x.type === 'string';
        })
        .share();

    /**
     * Never continue if any of the BEFORE tasks were flagged as invalid
     */
    const before = getBeforeTaskRunner(cli, trigger, watchTasks, tracker$);

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
     *
     */
    if (before.tasks.valid.length) {
        reporter.reportBeforeTaskList(before.sequence, cli, trigger.config);
    }

    /**
     * Never continue if any runners are invalid
     */
    if (runners.invalid.length) {
        runners.all.forEach(runner => reporter.reportWatchTaskTasksErrors(runner._tasks.all, runner.tasks, runner, config));
        return;
    }

    Rx.Observable.concat(
        before.runner$.do(() => reporter.reportWatchers(watchTasks.valid, config)),
        createObservablesForWatchers(runners.valid, trigger, tracker$)
            .filter(x => {
                // todo more robust way of determining if the current value was a report from crossbow (could be a task produced value)
                return typeof x.type === 'string';
            })
            .do(tracker)
            .do((x: TaskReport) => {
                // todo - simpler/shorter format for task reports on watchers
                reporter.watchTaskReport(x, trigger); // always log start/end of tasks
                if (x.type === TaskReportType.error) {
                    console.log(x.stats.errors[0].stack);
                }
            })
        // don't accept/catch any errors here as they may
        // belong to an outsider
    ).subscribe();
}

export function handleIncomingWatchCommand (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {
    if (cli.input.length === 1 || config.interactive) {
        if (cli.input.length === 1) {
            reporter.reportNoWatchTasksProvided();
            return;
        }
    }

    return execute(cli, input, config);
}
