/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {CrossbowInput, CLI, CrossbowReporter} from './index';
import {resolveTasks} from './task.resolve';
import Immutable = require('immutable');
import {ReportNames} from "./reporter.resolve";
import {Task} from "./task.resolve";
import {removeNewlines, readFilesFromDiskWithContent, ExternalFileContent, writeFileToDisk, readFilesFromDisk, FileNotFoundError, InputErrorTypes} from "./task.utils";
import {readdirSync} from "fs";
import * as utils from "./task.utils";

const debug = require("debug")("cb:command:docs");
export interface DocsError {type: DocsErrorTypes}
export interface DocsInputFileNotFoundError extends DocsError {file: utils.ExternalFile}
export interface DocsOutputFileExistsError extends DocsInputFileNotFoundError {};
export enum DocsErrorTypes {
    DocsInputFileNotFound = <any>"DocsInputFileNotFound",
    DocsOutputFileExists = <any>"DocsOutputFileExists"
}
export const docStartComment = '<!--crossbow-docs-start-->';
export const docEndComment   = '<!--crossbow-docs-end-->';
export const hasRegExp       = /<!--crossbow-docs-start-->([\s\S]+?)?<!--crossbow-docs-end-->/g;
export const hasExistingComments = (string) => hasRegExp.test(string);
export const readmeRegExp        = /readme\.(md|markdown)$/i;

function execute(trigger: CommandTrigger): any {

    const {input, config, reporter} = trigger;

    /**
     * Resolve all top-level tasks as these are the ones
     * that will used in the docs
     * @type {Tasks}
     */
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

    // reporter(ReportNames.DocsGenerated, tasks, markdown);

    /**
     * If the user provided the --file flag
     */
    if (config.file) {
        /**
         * Try to read the file from disk with content appended
         * @type {ExternalFileContent[]}
         */
        const maybes = readFilesFromDiskWithContent([config.file], config.cwd);
        const withErrors: Array<DocsInputFileNotFoundError> = maybes
            .filter(x => x.errors.length > 0)
            .map(x => {
                return {
                    type: DocsErrorTypes.DocsInputFileNotFound,
                    file: x
                }
            });

        /**
         * If the --file flag produced an error,
         * eg: --file shane.md -> but shane.md did not exist
         */
        if (withErrors.length) {

            /**
             * If we're not handing off, report the error
             */
            if (!config.handoff) {
                reporter(ReportNames.DocsInputFileNotFound, withErrors[0]);
            }

            return {
                errors: withErrors,
                tasks,
                markdown,
                output: []
            }
        }

        /**
         * At this point we have files to work with so we
         * either append the docs or insert them between existing
         * comments
         * @type {{content: string, file: ExternalFileContent}[]}
         */
        const output = maybes.map(getOutput);

        /**
         * If not handing off, we actually write to disk here
         */
        if (!config.handoff) {
            output.forEach(x => {
                reporter(ReportNames.DocsAddedToFile, x.file, x.content);
                writeFileToDisk(x.file, x.content);
            });
        }

        /**
         * Always return everything gathered
         */
        return {
            errors: [],
            tasks,
            markdown,
            output
        }
    }

    /**
     * If a user provides the 'output' flag, it means they want a new file creating
     */
    if (config.output) {
        const maybe = readFilesFromDisk([config.output], config.cwd);
        const available = maybe
            .filter(x => x.errors.length > 0)
            .filter(x => x.errors[0].type === InputErrorTypes.FileNotFound);

        if (!available.length) {
            const error = <DocsOutputFileExistsError>{type: DocsErrorTypes.DocsOutputFileExists, file: maybe[0]};
            if (!config.handoff) {
                reporter(ReportNames.DocsOutputFileExists, error);
            }
            return {
                errors: [error],
                tasks,
                markdown,
                output: []
            }
        }
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

    function getOutput(file: ExternalFileContent): {content: string, file: ExternalFileContent} {
        if (hasExistingComments(file.content)) {
            debug(`${file.relative} has the comments already in the file, so will replace`);
            const replaced = file.content.replace(hasRegExp, markdown);
            return {
                file,
                content: replaced
            };
        }
        debug(`${file.relative} DOES NOT have the comments, so will append to the end of the file`);
        return {
            file,
            content: file.content + '\n' + markdown
        };
    }

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
