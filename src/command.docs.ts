/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {CrossbowInput, CLI, CrossbowReporter} from './index';
import {resolveTasks} from './task.resolve';
import Immutable = require('immutable');
import Rx = require('rx');
import {ReportNames} from "./reporter.resolve";
import {Task} from "./task.resolve";
import {removeNewlines, readFilesFromDiskWithContent, ExternalFileContent} from "./task.utils";
import {readdirSync} from "fs";
import {writeFileSync} from "fs";

const debug = require("debug")("cb:command:docs");

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

    debug(`Amount of tasks to consider ${tasks.all.length}`);

    /**
     * If any tasks were invalid, refuse to generate docs
     * and prompt to run tasks command (for the full error output)
     */
    if (tasks.invalid.length) {
        debug(`Tasks were invalid, so skipping doc generation completely`);
        reporter(ReportNames.InvalidTasksSimple);
        return {tasks};
    }

    /**
     * Create the header for the markdown table
     * @type {string|string[]}
     */
    const docStartComment     = '<!--crossbow-docs-start-->';
    const docEndComment       = '<!--crossbow-docs-end-->';
    const hasRegExp           = /<!--crossbow-docs-start-->([\s\S]+?)?<!--crossbow-docs-end-->/g;
    const hasExistingComments = (string) => hasRegExp.test(string);
    const readmeRegExp        = /readme\.(md|markdown)$/i;
    const tasksHeader         = [`## Crossbow tasks

The following tasks have been defined by this project's Crossbow configuration.
Run any of them in the following way
 
\`\`\`shell
$ crossbow run <taskname>
\`\`\``];

    const tableHeader = ['|Task name|Description|', '|---|---|'];

    /**
     * Create the body for the table with taskname + description
     * @type {string[]}
     */
    const body     = tasks.valid.map((x: Task) => {
        const name = `|<pre>\`${x.baseTaskName}\`</pre>`;
        const desc = (function () {
                if (x.description) return removeNewlines(x.description);
                if (x.tasks.length) {
                    return ['**Alias for:**'].concat(x.tasks.map(x => `- \`${removeNewlines(x.baseTaskName)}\``)).join('<br>');
                }
            })() + '|';
        return [name, desc].join('|');
    });


    /**
     * Join the lines with a \n for correct formatting in markdown
     * @type {string}
     */
    const markdown = [docStartComment, tasksHeader, ...tableHeader].concat(body, docEndComment).join('\n');

    reporter(ReportNames.DocsGenerated, tasks, markdown);

    // Handle config.file use-case
    if (config.file) {
        // console.log(readFilesFromDiskWithContent([config.file], config.cwd));
        // return readFilesFromDiskWithContent([config.file], config.cwd);
        const maybes = readFilesFromDiskWithContent([config.file], config.cwd);
        if (maybes.filter(x => x.errors.length > 0)) {
            console.log(maybes);
        }
        return {}
    }

    // Handle config.output use-case
    if (config.output) {

    }

    // finally, handle looking up files in current cwd
    const output = readdirSync(config.cwd)
        .filter(x => readmeRegExp.test(x))
        .reduce((acc, item) => acc.concat(readFilesFromDiskWithContent([item], config.cwd)), []);

    function complete(output) {
        /**
         * If config.handoff, just return the tasks + markdown string
         * to skip any IO
         */
        if (trigger.config.handoff) {
            debug('Handing off');
            return {tasks, markdown, output};
        }
    }

    // debug(`Maybe existing files: ${maybes.length}`);
    //
    // if (maybes.filter(x => x.errors.length === 0)) {
    //     console.log('Had eerors');
    // }
    //
    // // if (!maybes.length) {
    // //
    // // }
    //
    // const output = (function () {
    //     if (hasExistingComments(maybes[0].content)) {
    //         debug(`${maybes[0].relative} has the comments already in the file, so will replace`);
    //         const replaced = maybes[0].content.replace(hasRegExp, markdown);
    //         return [{
    //             resolved: maybes[0].resolved,
    //             content: replaced
    //         }]
    //     } else {
    //         // added to end of file
    //         return [{
    //             resolved: maybes[0].resolved,
    //             content: maybes[0].content + '\n' + markdown
    //         }]
    //     }
    // })();

    /**
     * If config.handoff, just return the tasks + markdown string
     * to skip any IO
     */
    if (trigger.config.handoff) {
        debug('Handing off');
        return {tasks, markdown};
    }

    // const existingFiles = readFilesFromDiskWithContent(['readme.md'], config.cwd);
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
