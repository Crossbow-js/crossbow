/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {CrossbowInput, CLI, CrossbowReporter} from './index';
import Immutable = require('immutable');
import Rx = require('rx');
import {stripBlacklisted} from "./watch.utils";
import {resolveWatchTasks} from "./watch.resolve";
import {createWatchRunners} from "./watch.runner";
import {ReportTypes} from "./reporter.resolve";

function execute(trigger: CommandTrigger): void {
    const {input, config, reporter}   = trigger;
    const topLevelWatchers  = stripBlacklisted(Object.keys(input.watch));

    if (!topLevelWatchers.length) {
        reporter({type: ReportTypes.NoWatchersAvailable});
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
         * // todo, again, is it confusing to have none-errored watchers listed here
         */
        // runners.valid.forEach(runner => {
        //     _reporter.reportWatchTaskTasksErrors(runner._tasks.all, runner, config)
        // });
        /**
         * Now log the invalid runners
         */
        runners.invalid.forEach(runner => {
            reporter({type: ReportTypes.WatchTaskTasksErrors, data: {tasks: runner._tasks.all, runner, config}});
        });
        return;
    }
    reporter({type: ReportTypes.WatcherNames, data: {runners, trigger}});
}

export default function handleIncomingWatchersCommand(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration, reporter: CrossbowReporter) {
    execute({
        shared: new Rx.BehaviorSubject(Immutable.Map({})),
        cli,
        input,
        config,
        reporter,
        type: TriggerTypes.command
    });
}
