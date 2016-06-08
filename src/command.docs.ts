/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {LogLevel} from './reporters/defaultReporter';
import {CrossbowInput, CLI, CrossbowReporter} from './index';
import {resolveTasks} from './task.resolve';
import {getSimpleTaskList, twoCol} from "./reporters/task.list";

import Immutable = require('immutable');
import Rx = require('rx');
import {ReportNames} from "./reporter.resolve";
import {Task} from "./task.resolve.d";

export default function execute(trigger: CommandTrigger): any {

    const {input, config, reporter} = trigger;
    const resolved = resolveTasks(Object.keys(input.tasks), trigger);

    const header   = ['|Name|Description|', '|---|---|'];
    const body     = resolved.valid.map((x: Task) => {
        const name = `|**\`${x.baseTaskName}\`**`;
        const desc = (function () {
            if (x.description) return x.description;
            if (x.tasks.length) {
                return ['**Alias for**'].concat(x.tasks.map(x => `- \`${x.baseTaskName}\``)).join('<br>');
            }
        })() + '|';
        return [name, desc].join('|');
    });

    const markdown = header.concat(body).join('\n');

    if (trigger.config.handoff) {
        return {tasks: resolved, markdown};
    }

    if (resolved.all.length === 0) {
        reporter(ReportNames.NoTasksAvailable);
        return {tasks: resolved};
    }

    if (resolved.invalid.length) {
        reporter(ReportNames.InvalidTasksSimple);
        return {tasks: resolved};
    }

    // console.log(resolved.invalid);
    //     config.verbose === LogLevel.Verbose
    // ) {
    //     reporter(ReportNames.TaskTree, resolved.all, config, 'Available tasks:');
    // } else {
    //     reporter(ReportNames.SimpleTaskList, getSimpleTaskList(resolved.valid), resolved.valid);
    // }
    //
    // return {tasks: resolved};
    return 'shane';
}

export function handleIncomingDocsCommand(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration, reporter: CrossbowReporter) {
    return execute({
        cli,
        input,
        config,
        reporter,
        type: TriggerTypes.command
    });
}
