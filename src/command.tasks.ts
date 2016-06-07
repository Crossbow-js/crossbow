/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {
    reportTaskTree, LogLevel, reportNoTasksAvailable, reportTaskList,
    reportSimpleTaskList
} from './reporters/defaultReporter';
import {CrossbowInput, CLI, CrossbowReporter} from './index';
import {resolveTasks} from './task.resolve';
import {getSimpleTaskList} from "./reporters/task.list";

import Immutable = require('immutable');
import Rx = require('rx');

export default function execute(trigger: CommandTrigger): any {

    const {input, config} = trigger;
    const resolved = resolveTasks(Object.keys(input.tasks), trigger);

    if (trigger.config.handoff) {
        return {tasks: resolved};
    }

    if (resolved.all.length === 0) {
        reportNoTasksAvailable();
        return {tasks: resolved};
    }

    if (resolved.invalid.length ||
        config.verbose === LogLevel.Verbose
    ) {
        reportTaskTree(resolved.all, config, 'Available tasks:');
    } else {
        reportSimpleTaskList(getSimpleTaskList(resolved.valid));
    }

    return {tasks: resolved};
}

export function handleIncomingTasksCommand(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration, reporter: CrossbowReporter) {
    execute({
        cli,
        input,
        config,
        reporter,
        type: TriggerTypes.command
    });
}
