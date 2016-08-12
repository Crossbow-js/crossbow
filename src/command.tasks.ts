/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {LogLevel} from './reporters/defaultReporter';
import {CrossbowInput, CLI, CrossbowReporter} from './index';
import {resolveTasks} from './task.resolve';
import {getSimpleTaskList} from "./reporters/task.list";

import Immutable = require('immutable');
import Rx = require('rx');
import {ReportNames} from "./reporter.resolve";
import {getPossibleTasksFromDirectories} from "./file.utils";

function execute(trigger: CommandTrigger): any {

    const {input, config, reporter} = trigger;

    /**
     * Top level task names on the input
     */
    const taskNamesToResolve    = Object.keys(input.tasks);
    const taskNamesFromTasksDir = getPossibleTasksFromDirectories(config.tasksDir, config.cwd);

    const resolved = resolveTasks([...taskNamesToResolve, ...taskNamesFromTasksDir], trigger);

    if (trigger.config.handoff) {
        return {tasks: resolved};
    }

    if (resolved.all.length === 0) {
        reporter(ReportNames.NoTasksAvailable);
        return {tasks: resolved};
    }

    if (resolved.invalid.length ||
        config.verbose === LogLevel.Verbose
    ) {
        reporter(ReportNames.TaskTree, resolved.all, config, 'Available tasks:');
    } else {
        reporter(ReportNames.SimpleTaskList, getSimpleTaskList(resolved.valid), resolved.valid);
    }

    return {tasks: resolved};
}

export default function handleIncomingTasksCommand(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration, reporter: CrossbowReporter) {
    execute({
        cli,
        input,
        config,
        reporter,
        type: TriggerTypes.command
    });
}
