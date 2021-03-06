import {CommandTrigger, TriggerTypes} from "./command.run";
import {CrossbowConfiguration} from "./config";
import {CrossbowInput, CLI, CrossbowReporter} from "./index";
import {resolveTasks, Tasks, TaskTypes} from "./task.resolve";
import Immutable = require("immutable");
import Rx = require("rx");
import {ReportTypes} from "./reporter.resolve";
import {Task} from "./task.resolve";
import {removeNewlines, InputErrorTypes, isPublicTask, getPossibleTaskNames, isInternal} from "./task.utils";
import {readdirSync} from "fs";
import * as file from "./file.utils";
import {DocsAddedToFileReport} from "./reporter.resolve";
import {getLabel} from "./reporters/defaultReporter";
import {clean} from "./logger";

const debug = require("debug")("cb:command:docs");
export interface DocsError {
    type: DocsErrorTypes|ReportTypes;
}
export interface DocsInputFileNotFoundError extends DocsError {
    file: file.ExternalFile;
}
export interface DocsOutputFileExistsError extends DocsInputFileNotFoundError {
}
export enum DocsErrorTypes {
    DocsInputFileNotFound = <any>"DocsInputFileNotFound",
    DocsOutputFileExists = <any>"DocsOutputFileExists"
}
export const docStartComment = "<!--crossbow-docs-start-->";
export const docEndComment = "<!--crossbow-docs-end-->";
export const hasRegExp = /<!--crossbow-docs-start-->([\s\S]+?)?<!--crossbow-docs-end-->/g;
export const hasExistingComments = (inputString) => hasRegExp.test(inputString);
export const readmeRegExp = /readme\.(md|markdown)$/i;

export interface DocsFileOutput {
    file: file.ExternalFile;
    content: string;
}
export interface DocsCommandOutput {
    tasks: Tasks;
    errors: DocsError[];
    markdown?: string;
    output?: DocsFileOutput[];
}

export type DocsCommandComplete = Rx.Observable<{setup: DocsCommandOutput}>;

function execute(trigger: CommandTrigger): DocsCommandComplete {

    const {input, config, reporter} = trigger;

    /**
     * Resolve all top-level tasks as these are the ones
     * that will used in the docs
     * @type {Tasks}
     */
    const toResolve = getPossibleTaskNames(input);
    const tasks = resolveTasks(toResolve
        .filter(isPublicTask)
        .filter(x => !isInternal(x)), trigger);

    /**
     * If there were 0 tasks, exit with error
     */
    if (tasks.all.length === 0) {
        reporter({type: ReportTypes.NoTasksAvailable});
        return Rx.Observable.just({
            setup: {
                tasks,
                errors: [{type: ReportTypes.NoTasksAvailable}]
            }
        });
    }

    debug(`Amount of tasks to consider ${tasks.all.length}`);

    /**
     * If any tasks were invalid, refuse to generate docs
     * and prompt to run tasks command (for the full error output)
     */
    if (tasks.invalid.length) {
        debug(`Tasks were invalid, so skipping doc generation completely`);
        reporter({type: ReportTypes.DocsInvalidTasksSimple});
        return Rx.Observable.just({
            setup: {
                tasks,
                errors: [{type: ReportTypes.DocsInvalidTasksSimple}]
            }
        });
    }

    const markdown = getMarkdown(tasks.valid);

    /**
     * If the user provided the --file flag,
     * try to load that file & either wedge in the new docs or
     * append them
     */
    if (config.file) {
        return Rx.Observable.just({setup: handleFileFlag(tasks, markdown, trigger)});
    }

    /**
     * If a user provides the 'output' flag, it means they want a new file creating
     */
    if (config.output) {
        return Rx.Observable.just({setup: handleOutputFlag(tasks, markdown, trigger)});
    }

    /**
     * If both --flag and --output were NOT given, look for a readme in this current
     * directory
     * @type {Array}
     */
    const existingReadmeFiles = readdirSync(process.cwd())
        .filter(x => readmeRegExp.test(x))
        .reduce((acc, item) => acc.concat(file.readFilesFromDiskWithContent([item], config.cwd)), []);

    if (existingReadmeFiles.length) {
        const output = existingReadmeFiles.map(x => getFileOutput(x, markdown));

        reportAddToDocs(output, trigger);

        return Rx.Observable.just({
            setup: {
                errors: [],
                tasks,
                markdown,
                output
            }
        });
    }

    /**
     * At this point:
     * 1. NO --file flag given
     * 2. NO --output flag given
     * 3. NO existing readme files in cwd
     *
     * so, create a new one :)
     */
    const output = [{
        file: file.getStubFile("readme.md", config.cwd),
        content: markdown
    }];

    reportAddToDocs(output, trigger);

    return Rx.Observable.just({
        setup: {
            errors: [],
            tasks,
            markdown,
            output
        }
    });
}

/**
 * When adding docs to a file
 * 1. if file content does not exist, use raw markdown
 * 2. if docs exist, replace them
 * 3. if 1 & 2 fail, append
 */
function getFileOutput(file: file.ExternalFileContent, markdown): DocsFileOutput {

    /**
     * If there's no exisitng file content, just use the markdown
     */
    if (!file.content) {
        debug(`${file.relative} DOES NOT have any content`);
        return {file, content: markdown};
    }

    /**
     * If there's existing docs, wedge.
     */
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
        content: file.content + "\n" + markdown
    };
}

/**
 * When the --output flag was given
 *
 * eg:
 *
 *      $ crossbow docs --output newfile.md
 */
function handleOutputFlag(tasks: Tasks, markdown: string, trigger: CommandTrigger): DocsCommandOutput {
    const {config, reporter} = trigger;
    const maybe = file.readFilesFromDiskWithContent([config.output], config.cwd);
    const available = maybe
        .filter(x => x.errors.length > 0)
        .filter(x => x.errors[0].type === InputErrorTypes.FileNotFound);

    if (!available.length) {

        const error = <DocsOutputFileExistsError>{type: DocsErrorTypes.DocsOutputFileExists, file: maybe[0]};

        if (!config.handoff) {
            reporter({type: ReportTypes.DocsOutputFileExists, data: {error}});
        }

        return {
            errors: [error],
            tasks,
            markdown,
            output: []
        };
    }

    const output = [{
        file: maybe[0],
        content: markdown
    }];

    // Now we can report about writing to disk
    reportAddToDocs(output, trigger);

    return {
        errors: [],
        tasks,
        markdown,
        output
    };
}

/**
 * When the --file flag was given.
 *
 * eg:
 *
 *      $ crossbow docs --file readme.md
 */
function handleFileFlag(tasks: Tasks, markdown: string, trigger: CommandTrigger): DocsCommandOutput {
    const {config, reporter} = trigger;
    /**
     * Try to read the file from disk with content appended
     * @type {file.ExternalFileContent[]}
     */
    const maybes = file.readFilesFromDiskWithContent([config.file], config.cwd);
    const withErrors: Array<DocsInputFileNotFoundError> = maybes
        .filter(x => x.errors.length > 0)
        .map(x => {
            return {
                type: DocsErrorTypes.DocsInputFileNotFound,
                file: x
            };
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
            reporter({type: ReportTypes.DocsInputFileNotFound, data: {error: withErrors[0]}});
        }

        return {
            errors: withErrors,
            tasks,
            markdown,
            output: []
        };
    }

    /**
     * At this point we have files to work with so we
     * either append the docs or insert them between existing
     * comments
     * @type {{content: string, file: file.ExternalFileContent}[]}
     */
    const output = maybes.map(x => getFileOutput(x, markdown));

    /**
     * Now write to file
     */
    reportAddToDocs(output, trigger);

    /**
     * Always return everything gathered
     */
    return {
        errors: [],
        tasks,
        markdown,
        output
    };
}

function getMarkdown(tasks: Task[]): string {
    /**
     * Create the header for the markdown table
     * @type {string|string[]}
     */
    const tasksHeader = [`## Crossbow tasks

The following tasks have been defined by this project's Crossbow configuration.
Run any of them in the following way
 
\`\`\`shell
$ crossbow run <taskname>
\`\`\``];

    const tableHeader = "|Task name|Description|\n|---|---|";

    /**
     * Create the body for the table with taskname + description
     * @type {string[]}
     */
    const body = tasks.map((task: Task) => {
        const isParent = task.type === TaskTypes.ParentGroup;
        const name = (function () {
            if (isParent) {
                return `|<pre>\`${task.baseTaskName}:${task.subTasks[0]}\`</pre>`;
            }
            return `|<pre>\`${task.baseTaskName}\`</pre>`;
        })();
        const desc = (function () {
                if (task.description) return removeNewlines(task.description);
                if (isParent) {
                    if (task.tasks[0].description) {
                        return removeNewlines(task.tasks[0].description);
                    }
                }
                if (task.tasks.length) {
                    const subject = task.tasks;
                    return ["**Alias for:**"]
                        .concat(subject
                            .map(x => `- \`${getLabel(x)}\``)
                            .map(x => clean(x))
                        )
                        .join("<br>");
                }
            })() + "|";
        return [name, desc].join("|");
    }).join("\n");

    /**
     * Join the lines with a \n for correct formatting in markdown
     * @type {string}
     */
    return [docStartComment, tasksHeader, tableHeader, body, docEndComment].join("\n");
}

function reportAddToDocs(output: DocsFileOutput[], trigger: CommandTrigger) {

    const {config} = trigger;

    if (!config.handoff) {
        output.forEach(x => {
            trigger.reporter({
                type: ReportTypes.DocsAddedToFile,
                data: {
                    file: x.file
                } as DocsAddedToFileReport
            });
        });
    }
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
