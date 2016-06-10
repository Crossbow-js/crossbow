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
import {Task} from "./task.resolve";
import {removeNewlines} from "./task.utils";

function execute(trigger: CommandTrigger): any {

    const {input, config, reporter} = trigger;
    const tasks = resolveTasks(Object.keys(input.tasks), trigger);

    /**
     * If there were 0 tasks, exit with error
     */
    if (tasks.all.length === 0) {
        reporter(ReportNames.NoTasksAvailable);
        return {tasks};
    }

    /**
     * If any tasks were invalid, refuse to generate docs
     * and prompt to run tasks command (for the full error output)
     */
    if (tasks.invalid.length) {
        reporter(ReportNames.InvalidTasksSimple);
        return {tasks};
    }

    /**
     * Create the header for the markdown table
     * @type {string|string[]}
     */
    const header   = ['|Name|Description|', '|---|---|'];

    /**
     * Create the body for the table with taskname + description
     * @type {string[]}
     */
    const body     = tasks.valid.map((x: Task) => {
        const name = `|**\`${x.baseTaskName}\`**`;
        const desc = (function () {
                if (x.description) return x.description;
                if (x.tasks.length) {
                    return ['**Alias for**'].concat(x.tasks.map(x => `- \`${removeNewlines(x.baseTaskName)}\``)).join('<br>');
                }
            })() + '|';
        return [name, desc].join('|');
    });


    /**
     * Join the lines with a \n for correct formatting in markdown
     * @type {string}
     */
    const markdown = header.concat(body).join('\n');

    /**
     * If config.handoff, just return the tasks + markdown string
     * to skip any IO
     */
    if (trigger.config.handoff) {
        return {tasks, markdown};
    }
    
    reporter(ReportNames.DocsGenerated, tasks, markdown);

    // todo: 1 - look for readme.md files in cwd
    // todo: 1.1 - look for comments in any found files that signify start/end positions for docs
    // todo: 2 - if start/end positions are not in the doc, append to end of file

    // todo: 3 - allow --file flag to choose a different file (for the comment search)
    // todo: 4 - allow --output flag to instead output to a brand new file

    return {tasks, markdown};
}

export default function handleIncomingDocsCommand(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration, reporter: CrossbowReporter) {
    return execute({
        cli,
        input,
        config,
        reporter,
        type: TriggerTypes.command
    });
}
