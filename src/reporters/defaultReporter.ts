import {SequenceItemTypes, SequenceItem} from "../task.sequence.factories";
import {CrossbowConfiguration} from "../config";
import {Task} from "../task.resolve";
import {CLI, CrossbowInput} from "../index";
import {TaskOriginTypes, TaskTypes, TaskCollection, IncomingTaskItem} from "../task.resolve";
import {relative} from 'path';
import {Watcher} from "../watch.resolve";
import {WatchTask} from "../watch.resolve";

import * as taskErrors from "../task.errors";
import * as watchErrors from "../watch.errors";

import logger from "../logger";
import {compile, prefix} from '../logger';
import {WatchTasks} from "../watch.resolve";
import {resolveBeforeTasks} from "../watch.resolve";
import {resolveTasks} from "../task.resolve";
import {CommandTrigger} from "../command.run";
import {TaskReport, TaskReportType, TaskStats} from "../task.runner";
import {countSequenceErrors} from "../task.sequence";
import {InputErrorTypes, _e, isInternal, getFunctionName, ExternalFileInput, __e} from "../task.utils";
import {WatchRunners} from "../watch.runner";
import {InitConfigFileExistsError, InitConfigFileTypeNotSupported} from "../command.init";
import {ParsedPath} from "path";
import {parse} from "path";
import {dirname} from "path";
import {join} from "path";
import {twoColWatchers} from "./task.list";
import {
    ReportNames, Reporters, Reporter, ReporterFileNotFoundError, ReporterErrorTypes,
    ReporterError
} from "../reporter.resolve";

const l = logger.info;
const baseUrl = 'http://crossbow-cli.io/docs/errors';
const archy = require('archy');
const parsed = parse(__dirname);
const depsDir = join(dirname(parsed.dir), 'node_modules');

function nl() {
    l(`{gray:-}`);
}

export const enum LogLevel {
    Short = 2,
    Verbose
}

/**
 * There are multiple ways to output trees to the screen,
 * so this helper function helps to normalize the output
 * by providing the same padding on all but the first line.
 */
export function multiLineTree(tree: string) {
    const split = tree.split('\n');
    logger.info(split[0]);
    split.slice(1, -1).forEach(function (line) {
        logger.unprefixed('info', `   ${line}`);
    });
}

/**
 * Accept any string and output each line as though
 * logger.info was called for each line (to maintain prefixes etc)
 */
export function multiLine(input: string) {
    input.split('\n')
        .forEach(function (line) {
            logger.info(line);
        });
}

/**
 * Summary is a sequence tree with stats overlaid
 */
function reportSummary(sequence: SequenceItem[], cli: CLI, title: string, config: CrossbowConfiguration, runtime: number) {

    const errorCount = countSequenceErrors(sequence);

    // todo - show a reduced tree showing only errors
    if (config.verbose === LogLevel.Verbose || errorCount > 0) {
        const cliInput = cli.input.slice(1).map(x => `'${x}'`).join(' ');
        nl();
        reportSequenceTree(sequence, config, `+ Results from ${cliInput}`, true);
    }

    if (errorCount > 0) {
        nl();
        cli.input.slice(1).forEach(function (input) {
            const match = getSequenceItemThatMatchesCliInput(sequence, input);
            const errors = countSequenceErrors(match);
            if (errors > 0) {
                l(`{red:x} input: {yellow:${input}} caused an error`);
            }
        });
        nl();
        if (config.fail) {
            l(`{red:x} ${title} {yellow:${duration(runtime)} (${errorCount} %s)`, errorCount === 1 ? 'error' : 'errors');
        } else {
            l(`{yellow:x} ${title} {yellow:${duration(runtime)} (${errorCount} %s)`, errorCount === 1 ? 'error' : 'errors');
        }
    } else {
        nl();
        l(`{ok: } ${title} {yellow:${duration(runtime)}`);
    }
}

function _taskReport(report: TaskReport, label: string) {
    switch (report.type) {
        case TaskReportType.start:
            l(`{yellow:> +} ${label}`);
            break;
        case TaskReportType.end:
            l(`{green:> ✔} ${label} {yellow:(${duration(report.stats.duration)})}`);
            break;
        case TaskReportType.error:
            l(`{red:> x} ${label}`);
            break;
    }
}

function getSequenceItemThatMatchesCliInput(sequence: SequenceItem[], input: string): SequenceItem[] {
    return sequence.filter(function (item) {
        if (item.taskName) {
            if (item.taskName === input) {
                return true;
            }
        } else {
            return item.task.rawInput === input;
        }
    });
}

function getTaskCollectionList(taskCollection: TaskCollection): string[] {
    return taskCollection.map(incomingTaskItemAsString);
}

function incomingTaskItemAsString(x: IncomingTaskItem): string {
    if (typeof x === 'string') {
        return _e(x);
    }
    if (typeof x === 'function') {
        if (x.name) {
            return `[Function: ${x.name}]`;
        }
        return '[Function]';
    }
}

function reportTaskList(sequence: SequenceItem[], cli: CLI, titlePrefix = '', config: CrossbowConfiguration) {

    if (config.verbose === LogLevel.Verbose) {
        const cliInput = cli.input.slice(1).map(x => `'${x}'`).join(' ');
        nl();
        reportSequenceTree(sequence, config, `+ Task Tree for ${cliInput}`);
    } else {
        l('{yellow:+}%s {bold:%s}', titlePrefix, cli.input.slice(1).join(', '));
    }
}

function reportBeforeTaskList(sequence: SequenceItem[], cli: CLI, config: CrossbowConfiguration) {

    l('{yellow:+} %s {bold:%s}', 'Before tasks for watcher:', cli.input.join(', '));

    if (config.verbose === LogLevel.Verbose) {
        const cliInput = cli.input.map(x => `'${x}'`).join(' ');
        nl();
        reportSequenceTree(sequence, config, `+ Task Tree for ${cliInput}`);
        nl();
    }
}

function reportBeforeTasksDidNotComplete(error: Error) {
    l('{red:x} %s', error.message);
    l('  so none of the watchers started');
}


function getWatcherNode(watcher: Watcher) {
    const tasksString = (function () {
        return watcher.tasks.map(incomingTaskItemAsString).join(', ');
    })();
    return [
        `{bold:Patterns:} {cyan:${watcher.patterns.map(x => _e(x)).join(', ')}}`,
        `{bold:Tasks:} {cyan:${tasksString}}`,
    ].join('\n');
}

function reportTaskErrors(tasks: Task[], taskCollection: TaskCollection, input: CrossbowInput, config: CrossbowConfiguration) {

    l('{gray.bold:------------------------------------------------}');
    l('{err: } Sorry, there were errors resolving your tasks,');
    l('  So none of them were run.');
    l('{gray.bold:------------------------------------------------}');

    taskCollection.forEach(function (n, i) {
        reportTaskTree([tasks[i]], config, `+ input: '${n}'`);
    });
}

function reportWatchTaskTasksErrors(tasks: Task[], runner: Watcher, config: CrossbowConfiguration) {

    if (runner._tasks.invalid.length) {
        l('{gray.bold:---------------------------------------------------}');
        l(`{err: } Sorry, there were errors when resolving the tasks`);
        l(`  that will be used in the following watcher`);
        logWatcher(runner);
        reportTaskTree(tasks, config, `+ input: ${runner.parent}`);
    } else {
        l('{gray.bold:---------------------------------------------------}');
        l(`{ok: } No errors from`);
        logWatcher(runner);
        if (config.verbose === LogLevel.Verbose) {
            reportTaskTree(tasks, config, `+ input: ${runner.parent}`);
        }
    }
}

function logWatcher(runner) {
    l(`  {bold:Watcher name:} {cyan:${runner.parent}}`);
    l(`      {bold:Patterns:} {cyan:${runner.patterns.join(', ')}}`);
    l(`         {bold:Tasks:} {cyan:${runner.tasks.join(', ')}}`);
}

function logWatcherNames(runners: WatchRunners, trigger: CommandTrigger) {
    logger.info('{yellow:Available Watchers:}');

    if (trigger.config.verbose === LogLevel.Short) {
        twoColWatchers(runners).forEach(x => logger.info(`${x[0]} ${x[1]}`));
        return;
    }
    runners.valid.forEach(function (runner) {
        logger.info(`Name:  {bold:${runner.parent}}`);
        logger.info('Files: ' + runner.patterns.map(_e).map(x => `{cyan:${x}}`).join(', '));
        logger.info(`Tasks: ` + runner.tasks.map(x => `{magenta:${x}}`).join(', '));
        logger.info('');
    });

    logger.info(`Run your watchers in the following way:`);
    logger.info(``);

    runners.valid.forEach(function (runner) {
        logger.info(` {gray:$} crossbow watch {bold:${runner.parent}}`);
    });

    if (runners.valid.length > 1) {
        logger.info('');
        logger.info('Or run multiple watchers at once, such as:');
        logger.info(``);
        logger.info(' {gray:$} crossbow watch ' + runners.valid.slice(0, 2).map(x => `{bold:${x.parent}}`).join(' '));
        logger.info('');
    }
}

function reportBeforeWatchTaskErrors(watchTasks: WatchTasks, trigger: CommandTrigger): void {

    l('{err: } Sorry, there were errors resolving your {red:`before`} tasks');
    l('  So none of them were run, and no watchers have begun either.');

    watchTasks.all.forEach(function (watchTask) {
        const cliInput = resolveBeforeTasks(trigger.config.before, trigger.input, [watchTask]);
        const tasks = resolveTasks(cliInput, trigger);

        if (!tasks.all.length) {
            return;
        }

        if (trigger.config.verbose === LogLevel.Verbose) {
            return reportTaskTree(tasks.all, trigger.config, `+ Tasks to run before: '${watchTask.name}'`);
        }

        if (tasks.invalid.length) {
            return reportTaskTree(tasks.all, trigger.config, `+ Tasks to run before: '${watchTask.name}'`);
        }
    });
}

function logWatchErrors(tasks: WatchTask[]): void {

    const errorCount = tasks.reduce(function (acc, item) {
        return acc + item.errors.length;
    }, 0);

    tasks.forEach(function (task: WatchTask) {
        if (task.errors.length) {
            logger.info(`{red.bold:x '${task.name}'}`);
            multiLine(getWatchError(task.errors[0], task));
        } else {
            logger.info(`{ok: } '${task.name}'}`);
        }
    });

    errorSummary(errorCount);
}

function errorSummary(errorCount: number) {
    if (errorCount) {
        l(`{red:x} ${errorCount} %s found (see above)`, errorCount === 1 ? 'error' : 'errors');
    } else {
        l(`{ok: } 0 errors found`);
    }
}

function reportNoTasksProvided() {
    heading(`Entering interactive mode as you didn't provide a task to run`)
}

function heading(title) {
    l(`${title}`);
}

export interface CrossbowError extends Error {
    _cbError?: boolean
}

function getErrorText(sequenceLabel: string, stats: TaskStats, err: CrossbowError, config: CrossbowConfiguration): string {

    if (!err.stack) {
        return err.toString();
    }

    /**
     * If _cbError is on the error object, it's a crossbow-generated
     * error so we handle it as though we know what we're doing
     */
    if (err._cbError) {
        return [
            `{red.bold:x} {red:${sequenceLabel}} {yellow:(${duration(stats.duration)})}`,
            __e(err.stack)
        ].join('\n');
    }

    /**
     * At this point we have no idea what type the error is, so
     * the following code just makes the first line red and then
     * processes the stack traces (to remove internals)
     */
    const head = [
        `{red.bold:x} ${sequenceLabel} {yellow:(${duration(stats.duration)})}`,
        `{red.bold:${err.stack.split('\n').slice(0, 1)}}`
    ];

    const body = err.stack.split('\n').slice(1);
    const stack = getStack(body, config);
    const tail = `- Please see above for any output that may of occurred`;
    if (!stack) {
        return [...head, tail].join('\n');
    }
    return [...head, ...stack, tail].join('\n');
}

export function getStack(stack: string[], config: CrossbowConfiguration): string[] {

    /**
     * An array of string that can be compared
     * against each line of the stack trace to determine
     * if that line should be stipped. EG: we
     * don't want to muddy up stack traces with internals
     * from Rx/Immutable etc.
     */
    const stringMatches = (function () {
        if (config.debug) return [];
        return [
            parsed.dir,
            depsDir,
            'at bound (domain.js',
            'at runBound (domain.js'
        ];
    })();

    return stack
        .filter(line => {
            return stringMatches.every(string => {
                return line.indexOf(string) === -1;
            });
        });
}

/**
 * Add meta info to a sequence item suing the stats.
 * eg:
 *   @npm webpack -w
 * ->
 *   ✔ @npm webpack -w (14.2s)
 */
function appendStatsToSequenceLabel(label: string, stats: TaskStats, config: CrossbowConfiguration) {
    /**
     * If any errors occured, append the error to the
     * label so it shows in the correct part of the tree
     */
    if (stats.errors.length) {
        const err = stats.errors[0];
        return getErrorText(label, stats, err, config);
    }

    /**
     * the item did not start if `started` is falsey
     */
    if (!stats.started) {
        return `{yellow:x} ${label} {yellow:(didn't start)}`;
    }

    /**
     * 'completed' means this task emitted a completion report.
     */
    if (stats.completed) {
        return `{green:✔} ` + label + ` {yellow:(${duration(stats.duration)})}`;
    }

    /**
     * At this point, the task DID start, but the completed
     * flag is absent so we assume it was halted mid-flight.
     */
    return `{yellow:x} ` + label + ` {yellow:(didn't complete, ${duration(stats.duration)})}`;
}

/**
 * Show a tree of function calls
 */
export function reportSequenceTree(sequence: SequenceItem[], config: CrossbowConfiguration, title, showStats = false) {

    const toLog = getItems(sequence, []);
    const o = archy({label: `{yellow:${title}}`, nodes: toLog});
    multiLineTree(o);

    function getItems(items, initial) {
        return items.reduce((acc, item: SequenceItem) => {
            let label = getSequenceLabel(item, config);
            const stats = item.stats;
            if (showStats && item.type === SequenceItemTypes.Task) {
                label = appendStatsToSequenceLabel(label, item.stats, config);
            }
            let nodes = getItems(item.items, []);
            return acc.concat({
                label: label,
                nodes: nodes
            });
        }, initial);
    }
}

function getSequenceLabel(item: SequenceItem, config: CrossbowConfiguration) {
    /**
     * Get the sequence label for a runnable task
     */
    if (item.type === SequenceItemTypes.Task) {
        if (item.subTaskName) {
            if (item.fnName) {
                return `${item.task.rawInput} - ${item.task.taskName} [Function: {bold:${item.fnName}}] with config {bold:${item.subTaskName}}`;
            } else {
                return `${item.task.taskName} with config {bold:${item.subTaskName}}`;
            }
        }
        if (item.task.type === TaskTypes.InlineFunction) {
            return `${item.task.rawInput} ${getFunctionName(item.task.inlineFunctions[0])}`;
        }
        if (item.task.type === TaskTypes.ExternalTask) {
            return `${item.task.rawInput}`;
        }
        if (item.task.type === TaskTypes.Adaptor) {
            return `${item.task.rawInput}`;
        }
        if (item.task.externalTasks.length) {
            return moduleLabel(item.task);
        }
        return item.task.taskName;
    }

    /**
     * Here we are dealing with a ParallelGroup or a SeriesGroup
     */
    if (item.items.length === 1) {
        /**
         * Don't append 'series' or 'parallel' if this group
         * only consists of 1 item
         */
        return compile(`{bold:${item.taskName}}`);
    } else {
        const typeLabel = (() => {
            if (item.type === SequenceItemTypes.ParallelGroup) {
                return '<parallel>';
            }
            return '<series>';
        })();
        return compile(`{bold:${item.taskName}} ${typeLabel}`);
    }
}

export function reportTaskTree(tasks: Task[], config: CrossbowConfiguration, title: string) {

    let errorCount = 0;
    const toLog = getTasks(tasks, [], 0);
    const archy = require('archy');
    const output = archy({label: `{yellow:${title}}`, nodes: toLog});

    multiLineTree(output);
    errorSummary(errorCount);

    function getTasks(tasks, initial, depth) {

        return tasks.reduce((acc, task) => {

            const errors = getErrors(task);

            if (errors.length) {
                errorCount += errors.length;
            }

            /**
             * Never show internal tasks at top-level
             */
            if (depth === 0) {
                if (isInternal(task.rawInput)) {
                    return acc;
                }
            }

            let nodes = getTasks(task.tasks, [], depth++);
            let label = [getLabel(task), ...errors].join('\n');

            if (config.verbose === LogLevel.Verbose) {
                return acc.concat({
                    label: label,
                    nodes: nodes
                });
            }

            if (task.type === TaskTypes.Adaptor ||
                task.type === TaskTypes.ExternalTask) {
                if (task.errors.length) {
                    return acc.concat({
                        label: label,
                        nodes: []
                    });
                }
                return acc;
            }

            return acc.concat({
                label: label,
                nodes: nodes
            });

        }, initial);
    }
}

export function getErrors(task) {
    if (!task.errors.length) {
        return [];
    }
    if (task.errors[0].type === taskErrors.TaskErrorTypes.TaskNotFound) {
        return [getSingleError(task.errors[0], task)];
    }
    return task.errors.map(error => getSingleError(error, task));
}

function getSingleError(error, task) {
    return getExternalError(taskErrors.TaskErrorTypes[error.type], error, task);
}

function getWatchError(error, task) {
    return getExternalError(watchErrors.WatchTaskErrorTypes[error.type], error, task);
}

function getExternalError<A, B>(type, error: A, val2?: B) {
    return [
        compile(`{red:-} {bold:Error Type:}  ${type}`),
        ...require('./error.' + type).apply(null, [error, val2]),
        compile(`{red:-} {bold:Documentation}: {underline:${baseUrl}/{bold.underline:${type}}}`),
    ].join('\n');
}

function moduleLabel(task: Task) {
    const filepath = relative(process.cwd(), task.externalTasks[0].rawInput);
    if (task.taskName === filepath) {
        return `${task.taskName}`;
    }
    return `${task.taskName} ${filepath}`;
}

function npmScriptLabel(task: Task) {
    return `{magenta:[npm script]} ${task.command}`;
}

export function getLabel(task) {

    if (task.type === TaskTypes.InlineFunction) {
        const fnName = (function () {
            if (task.inlineFunctions[0].name !== '') {
                return `[Function: ${task.inlineFunctions[0].name}]`;
            }
            return '[Function]';
        })();
        return maybeErrorLabel(task, `${task.taskName} ${fnName}`);
    }

    if (task.origin === TaskOriginTypes.NpmScripts) {
        return npmScriptLabel(task);
    }

    if (task.type === TaskTypes.TaskGroup) {
        if (task.errors.length) {
            return `{red.bold:x ${task.taskName}}`;
        }
        return `{bold:${task.taskName}}`;
    }

    if (task.type === TaskTypes.ExternalTask) {
        return maybeErrorLabel(task, task.taskName);
    }

    if (task.type === TaskTypes.Adaptor) {
        return maybeErrorLabel(task, task.rawInput);
    }

    if (task.errors.length) {
        return `{red.bold:x ${task.taskName}}`;
    }

    return `${task.taskName}}`;
}

function maybeErrorLabel(task: Task, label: string): string {
    if (task.errors.length) {
        return `{red.bold:x ${label}}`;
    }
    return label;
}

function duration(ms) {
    return String((Number(ms) / 1000).toFixed(2)) + 's';
}

const reporterFunctions = {
    [ReportNames.UsingConfigFile]: function (inputs: ExternalFileInput[]) {
        inputs.forEach(function (input) {
            logger.info(`Using: {cyan.bold:${input.relative}}`);
        });
    },
    [ReportNames.InputFileNotFound]: function (inputs: ExternalFileInput[]) {
        heading(`Sorry, there were errors resolving your input files`);
        inputs.forEach(function (item) {
            logger.info(`{red.bold:x ${item.path}}`);
            multiLine(getExternalError(item.errors[0].type, item.errors[0], item))
        });
    },
    [ReportNames.InvalidReporter]: function (reporters: Reporters) {
        heading(`{red.bold:x} Sorry, there were problems resolving your reporters`);
        reporters.invalid.forEach(function (reporter: Reporter) {
            reporter.errors.forEach(function (err: ReporterError) {
                if (err.type === ReporterErrorTypes.ReporterFileNotFound) {
                    heading(`{red.bold:x ${err.file.resolved}`);
                    multiLine(getExternalError(err.type, err));
                }
                if (err.type === ReporterErrorTypes.ReporterTypeNotSupported) {
                    multiLine(getExternalError(err.type, err));
                }
            })
        });
    },
    [ReportNames.DuplicateConfigFile]: function (error: InitConfigFileExistsError) {
        heading(`Sorry, this would cause an existing file to be overwritten`);
        logger.info(`{red.bold:x ${error.file.path}}`);
        multiLine(getExternalError(error.type, error, error.file));
    },
    [ReportNames.ConfigFileCreated]: function (parsed: ParsedPath) {
        multiLine(`{green:✔} Created file: {cyan.bold:${parsed.base}}
 
Now, try the \`{yellow:hello-world}\` example in that file by running: 
 
  {gray:$} crossbow run {bold:hello-world} 
 
Or to see multiple tasks running, with some in parallel, try: 

  {gray:$} crossbow run {bold:all}`);
    },
    [ReportNames.InitConfigTypeNotSupported]: function (error: InitConfigFileTypeNotSupported) {
        heading(`Sorry, the type {cyan.bold:${error.providedType}} is not currently supported`);
        logger.info(`{red.bold:x '${error.providedType}'}`);
        multiLine(getExternalError(error.type, error));
    },
    [ReportNames.SimpleTaskList]: function (lines: string[]) {
        logger.info('{yellow:Available Tasks:');
        lines.forEach(line => logger.info(line));
    },
    [ReportNames.TaskTree]: reportTaskTree,
    [ReportNames.TaskList]: reportTaskList,
    [ReportNames.TaskErrors]: reportTaskErrors,
    [ReportNames.TaskReport]: function (report: TaskReport, trigger: CommandTrigger) {
        const label = getSequenceLabel(report.item, trigger.config);
        _taskReport(report, label);
    },
    [ReportNames.InvalidTasksSimple]: function (tasks: Task[]) {
        logger.info('{red.bold:x Invalid tasks');
        logger.info('Sorry, we cannot generate documentation for you right now');
        logger.info('as you have invalid tasks. Please run {bold:$ crossbow tasks} to see');
        logger.info('details about these errors');
    },
    [ReportNames.NoTasksAvailable]: function () {
        heading('Sorry, there were no tasks available.');
        logger.info(`{red.bold:x Input: ''}`);
        multiLine(getExternalError(InputErrorTypes.NoTasksAvailable, {}));
    },
    [ReportNames.NoTasksProvided]: reportNoTasksProvided,
    [ReportNames.BeforeWatchTaskErrors]: reportBeforeWatchTaskErrors,
    [ReportNames.BeforeTaskList]: reportBeforeTaskList,
    [ReportNames.BeforeTasksDidNotComplete]: reportBeforeTasksDidNotComplete,
    [ReportNames.WatchTaskTasksErrors]: reportWatchTaskTasksErrors,
    [ReportNames.WatchTaskErrors]: function (tasks: WatchTask[]) {
        heading(`Sorry, there were errors resolving your watch tasks`);
        logWatchErrors(tasks);
    },
    [ReportNames.WatchTaskReport]: function (report: TaskReport, trigger: CommandTrigger) {
        const label = getSequenceLabel(report.item, trigger.config);
        _taskReport(report, label);
    },
    [ReportNames.NoWatchersAvailable]: function () {
        heading('Sorry, there were no watchers available to run');
        logger.info(`{red.bold:x No watchers available}`);
        multiLine(getExternalError(InputErrorTypes.NoWatchersAvailable, {}));
    },
    [ReportNames.NoWatchTasksProvided]: function () {
        heading(`Entering interactive mode as you didn't provide a watcher to run`)
    },
    [ReportNames.Watchers]: function (watchTasks: WatchTask[]) {
        nl();
        l(`{yellow:+} Watching...`);
        watchTasks.forEach(function (watchTask) {
            const o = archy({
                label: `{yellow:+ input: '${watchTask.name}'}`, nodes: watchTask.watchers.map(getWatcherNode)
            });
            multiLineTree(o);
        });
    },
    [ReportNames.WatcherNames]: logWatcherNames,
    [ReportNames.NoFilesMatched]: function (watcher: Watcher) {
        l('{red:x warning} `{cyan:%s}` did not match any files', watcher.patterns.join(' '));
    },

    [ReportNames.WatcherTriggeredTasks]: function(index: number, taskCollection: TaskCollection) {
        l(`{yellow:+} [${index}] ${getTaskCollectionList(taskCollection).join(', ')}`);
    },
    [ReportNames.WatcherTriggeredTasksCompleted]: function (index: number, taskCollection: TaskCollection, time: number) {
        l(`{green:✔} [${index}] ${getTaskCollectionList(taskCollection).join(', ')} {yellow:(${duration(time)})}`);
    },
    [ReportNames.DocsGenerated]: function docsGenerated(tasks, markdown) {

        // Todo - should we always output to the console?
        // l(`{green:✔} Documentation generated - copy/paste the following markdown into a readme.md file`);
        // console.log(markdown);
    },
    [ReportNames.Summary]: reportSummary,
};

export default function (name, ...args) {
    if (typeof reporterFunctions[name] === 'function') {
        return reporterFunctions[name].apply(null, args);
    }

    console.log(`Reporter not defined for '${name}' Please implement this method`);
}
