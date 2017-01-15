
import {CommandTrigger, TriggerTypes} from "./command.run";
import {CrossbowConfiguration} from "./config";
import {CrossbowInput, CLI, CrossbowReporter} from "./index";
import Immutable = require("immutable");
import Rx = require("rx");
import {stripBlacklisted} from "./watch.utils";
import {resolveWatchTasks, WatchTasks} from "./watch.resolve";
import {createWatchRunners, WatchRunners} from "./watch.runner";
import {ReportTypes} from "./reporter.resolve";

export interface WatchersCommandError {
    type: ReportTypes;
}
export interface WatchersCommandOutput {
    watchTasks?: WatchTasks;
    runners?: WatchRunners;
    errors: WatchersCommandError[];
}
export type WatchersCommandComplete = Rx.Observable<{setup: WatchersCommandOutput}>;

function execute(trigger: CommandTrigger): WatchersCommandComplete {
    const {input, config, reporter} = trigger;
    const topLevelWatchers          = stripBlacklisted(Object.keys(input.watch));

    if (!topLevelWatchers.length) {
        reporter({
            type: ReportTypes.NoWatchersAvailable
        });
        return Rx.Observable.just({
            setup: {
                errors: [{type: ReportTypes.NoWatchersAvailable}]
            }
        });
    }

    const watchTasks = resolveWatchTasks(topLevelWatchers, trigger);
    const runners    = createWatchRunners(watchTasks, trigger);

    /**
     * Never continue if any runners are invalid
     */
    if (runners.invalid.length) {
        /**
         * Now log the invalid runners
         */
        runners.invalid.forEach(runner => {
            reporter({type: ReportTypes.WatchTaskTasksErrors, data: {tasks: runner._tasks.all, runner, config}});
        });

        return Rx.Observable.just({
            setup: {
                watchTasks,
                runners,
                errors: [{type: ReportTypes.WatchTaskTasksErrors}]
            }
        });
    }

    return Rx.Observable.just({
        setup: {
            watchTasks,
            runners,
            errors: []
        }
    });
}

export default function handleIncomingWatchersCommand(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration, reporter: CrossbowReporter) {
    return execute({
        shared: new Rx.BehaviorSubject(Immutable.Map({})),
        cli,
        input,
        config,
        reporter,
        type: TriggerTypes.command
    });
}
