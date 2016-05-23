/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import * as reporter from './reporters/defaultReporter';
import {CrossbowInput, CLI} from './index';
import {resolveTasks} from './task.resolve';
import Immutable = require('immutable');
import Rx = require('rx');
import {stripBlacklisted} from "./watch.utils";
import {resolveWatchTasks, Watcher} from "./watch.resolve";
import {createWatchRunners, WatchRunners} from "./watch.runner";
import {logWatcherNames} from "./reporters/defaultReporter";

export default function execute(trigger: CommandTrigger): void {
    const {input, config}   = trigger;
    const topLevelWatchers  = stripBlacklisted(Object.keys(input.watch));

    if (!topLevelWatchers.length) {
        reporter.reportNoWatchersAvailable();
        return;
    }

    const watchTasks = resolveWatchTasks(topLevelWatchers, trigger);
    const runners = createWatchRunners(watchTasks, trigger);

    /**
     * Never continue if any runners are invalid
     */
    if (runners.invalid.length) {
        /**
         * Log valid runners first, so that errors are not lost in the console output
         */
        runners.valid.forEach(runner => {
            reporter.reportWatchTaskTasksErrors(runner._tasks.all, runner, config)
        });
        /**
         * Now log the invalid runners
         */
        runners.invalid.forEach(runner => {
            reporter.reportWatchTaskTasksErrors(runner._tasks.all, runner, config)
        });
        return;
    }
    logWatcherNames(runners, trigger);
}

export function handleIncomingWatchersCommand(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration) {
    execute({
        shared: new Rx.BehaviorSubject(Immutable.Map({})),
        cli,
        input,
        config,
        type: TriggerTypes.command
    });
}
