import {SequenceItemTypes, SequenceItem} from "../task.sequence.factories";
import {CrossbowConfiguration} from "../config";
import {Task} from "../task.resolve.d";
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
import {
    InputFiles, InputErrorTypes, _e, isInternal, getFunctionName, ExternalFile,
    ExternalFileInput
} from "../task.utils";
import {WatchRunners} from "../watch.runner";
import {InitConfigFileExistsError, InitConfigFileTypes, InitConfigFileTypeNotSupported} from "../command.init";
import {ParsedPath} from "path";

const l = logger.info;
const baseUrl = 'http://crossbow-cli.io/docs/errors';
const archy = require('archy');

function nl() {
    l(`{gray:-}`);
}

export const enum LogLevel {
    Short = 2,
    Verbose
}

export function reportUsingConfigFile(inputs: ExternalFileInput[]) {
    inputs.forEach(function (input) {
        logger.info(`Using: {cyan.bold:${input.relative}}`);
    });
}

export function reportMissingConfigFile(inputs: ExternalFileInput[]) {
    heading(`Sorry, there were errors resolving your input files`);
    inputs.forEach(function (item) {
        const o = archy({
            label: `{yellow:+ input: '${item.path}'}`, nodes: [
                {
                    label: [
                        `{red.bold:x ${item.path}}`,
                        getExternalError(item.errors[0].type, item.errors[0], item)
                    ].join('\n')
                }
            ]
        }, prefix);
        logger.info(o.slice(25, -1));
    });
}

export function reportInitConfigTypeNotSupported(error: InitConfigFileTypeNotSupported) {
    heading(`Sorry, the type {cyan.bold:${error.providedType}} is not currently supported`);
    const o = archy({
        label: `{yellow:+ input: '${error.providedType}'}`, nodes: [
            {
                label: [
                    `{red.bold:x ${error.providedType}}`,
                    getExternalError(error.type, error)
                ].join('\n')
            }
        ]
    }, prefix);
    logger.info(o.slice(25, -1));
}

export function reportDuplicateConfigFile(error: InitConfigFileExistsError) {
    heading(`Sorry, this would cause an existing file to be overwritten`);
    const o = archy({
        label: `{yellow:+ Attempted: '${error.file.path}'}`, nodes: [
            {
                label: [
                    `{red.bold:x ${error.file.path}}`,
                    getExternalError(error.type, error, error.file)
                ].join('\n')
            }
        ]
    }, prefix);
    logger.info(o.slice(25, -1));
}

export function reportConfigFileCreated(parsed: ParsedPath, type: InitConfigFileTypes) {
    const output =
`{green:✔} Created file: {cyan.bold:${parsed.base}}
     Directory: {cyan.bold:${parsed.dir}}
 
Now, try the \`{yellow:hello-world}\` example in that file by running: 
 
  {gray:$} crossbow run {bold:hello-world} 
 
Or to see multiple tasks running, with some in parallel, try: 

  {gray:$} crossbow run {bold:all}`.split('\n');

    output.forEach(function (arg) {
        logger.info(arg);
    });
}

export function reportSummary(sequence: SequenceItem[], cli: CLI, title: string, config: CrossbowConfiguration, runtime: number) {

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

export function taskReport(report: TaskReport, trigger: CommandTrigger) {
    const label = getSequenceLabel(report.item, trigger.config);
    _taskReport(report, label);
}

function _taskReport(report: TaskReport, label: string) {
    switch (report.type) {
        case TaskReportType.start:
            l(`{yellow:+ [${report.item.seqUID}]} ${label}`);
            break;
        case TaskReportType.end:
            l(`{green:✔ [${report.item.seqUID}]} ${label} {yellow:(${duration(report.stats.duration)})}`);
            break;
        case TaskReportType.error:
            l(`{red:x [${report.item.seqUID}]} ${label}`);
            break;
    }
}

export function watchTaskReport(report: TaskReport, trigger: CommandTrigger) {
    const label = getSequenceLabel(report.item, trigger.config);
    // todo make loglevel an enum
    _taskReport(report, label);
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

export function reportWatcherTriggeredTasksCompleted(index: number, taskCollection: TaskCollection, time: number) {
    l(`{green:✔} [${index}] ${getTaskCollectionList(taskCollection).join(', ')} {yellow:(${duration(time)})}`);
}
export function reportWatcherTriggeredTasks(index: number, taskCollection: TaskCollection) {
    l(`{yellow:+} [${index}] ${getTaskCollectionList(taskCollection).join(', ')}`);
}

export function getTaskCollectionList(taskCollection: TaskCollection): string[] {
    return taskCollection.map(incomingTaskItemAsString);
}

export function incomingTaskItemAsString (x: IncomingTaskItem): string {
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

/**
 * Log the task list
 */
export function reportTaskList(sequence: SequenceItem[], cli: CLI, titlePrefix = '', config: CrossbowConfiguration) {

    if (config.verbose === LogLevel.Verbose) {
        const cliInput = cli.input.slice(1).map(x => `'${x}'`).join(' ');
        nl();
        reportSequenceTree(sequence, config, `+ Task Tree for ${cliInput}`);
    } else {
        l('{yellow:+}%s {bold:%s}', titlePrefix, cli.input.slice(1).join(', '));
    }
}

export function reportBeforeTaskList(sequence: SequenceItem[], cli: CLI, config: CrossbowConfiguration) {

    l('{yellow:+} %s {bold:%s}', 'Before tasks for watcher:', cli.input.join(', '));

    if (config.verbose === LogLevel.Verbose) {
        const cliInput = cli.input.map(x => `'${x}'`).join(' ');
        nl();
        reportSequenceTree(sequence, config, `+ Task Tree for ${cliInput}`);
        nl();
    }
}

export function reportBeforeTasksDidNotComplete(error: Error) {
    l('{red:x} %s', error.message);
    l('  so none of the watchers started');
}

export function reportWatchers(watchTasks: WatchTask[], config: CrossbowConfiguration) {
    nl();
    l(`{yellow:+} Watching...`);
    watchTasks.forEach(function (watchTask) {
        const o = archy({
            label: `{yellow:+ input: '${watchTask.name}'}`, nodes: watchTask.watchers.map(getWatcherNode)
        }, prefix);
        logger.info(o.slice(25, -1));
    });
}

export function getWatcherNode(watcher: Watcher) {
    const tasksString = (function () {
        return watcher.tasks.map(incomingTaskItemAsString).join(', ');
    })();
    return [
        `{bold:Patterns:} {cyan:${watcher.patterns.map(x => _e(x)).join(', ')}}`,
        `{bold:Tasks:} {cyan:${tasksString}}`,
    ].join('\n');
}

export function reportTaskErrors(tasks: Task[], taskCollection: TaskCollection, input: CrossbowInput, config: CrossbowConfiguration) {

    l('{gray.bold:------------------------------------------------}');
    l('{err: } Sorry, there were errors resolving your tasks,');
    l('  So none of them were run.');
    l('{gray.bold:------------------------------------------------}');

    taskCollection.forEach(function (n, i) {
        reportTaskTree([tasks[i]], config, `+ input: '${n}'`);
    });
}

export function reportWatchTaskTasksErrors(tasks: Task[], runner: Watcher, config: CrossbowConfiguration) {

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

export function logWatcher (runner) {
    l(`  {bold:Watcher name:} {cyan:${runner.parent}}`);
    l(`      {bold:Patterns:} {cyan:${runner.patterns.join(', ')}}`);
    l(`         {bold:Tasks:} {cyan:${runner.tasks.join(', ')}}`);
}

export function logWatcherNames (runners: WatchRunners, trigger: CommandTrigger) {
    const o = archy({
        label: '{yellow:Available Watchers}',
        nodes: runners.valid.map(function (runner) {
            if (trigger.config.verbose === LogLevel.Verbose) {
                return logWatcherName(runner);
            }
            return `{bold:${runner.parent}}`;
        })
    }, prefix);
    logger.info(o.slice(25, -1));
    logger.info('');
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

export function logWatcherName (runner) {
    return {
        label: `{bold:${runner.parent}}`,
        nodes: [
            {
                label: [
                    // `Patterns`,
                    ...runner.patterns.map(_e).map(x => `{cyan.bold:${x}}`)
                ].join('\n')
            },
            {
                label: [
                    // `Tasks`,
                    ...runner.tasks.map(x => `{magenta:${x}}`)
                ].join('\n')
            },
        ]
    };
    // logger.info(o.slice(25, -1));
}

export function reportNoFilesMatched(runner) {
    l('{red:x warning} `{cyan:%s}` did not match any files', runner.patterns.join(' '));
}

export function reportBeforeWatchTaskErrors(watchTasks: WatchTasks, trigger: CommandTrigger): void {

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

export function reportWatchTaskErrors(tasks: WatchTask[], cli: CLI, input: CrossbowInput) {

    heading(`Sorry, there were errors resolving your watch tasks`);
    logWatchErrors(tasks);
}

export function logWatchErrors(tasks: WatchTask[]): void {

    tasks.forEach(function (task: WatchTask) {
        if (task.errors.length) {
            const o = archy({
                label: `{yellow:+ input: '${task.name}'}`, nodes: [
                    {
                        label: [
                            `{red.bold:x ${task.name}}`,
                            getWatchError(task.errors[0], task)
                        ].join('\n')
                    }
                ]
            }, prefix);
            logger.info(o.slice(25, -1));
        } else {
            const watchTree = task.watchers.map(w => {
                return {
                    label: [
                        compile(`Patterns: {cyan:${w.patterns.join(', ')}}`),
                        compile(`   Tasks: {magenta:${w.tasks.join(', ')}}`)
                    ].join('\n')
                };
            });
            const o = archy({label: `{yellow:+ ${task.name}}`, nodes: watchTree}, prefix);
            logger.info(o.slice(25, -1));
        }
    })
}

export function reportNoTasksProvided() {
    heading(`Entering interactive mode as you didn't provide a task to run`)
}

function heading(title) {
    l(`${title}`);
}

export function reportNoTasksAvailable() {
    heading('Sorry, there were no tasks available to run');
    const o = archy({
        label: `{yellow:+ input: ''}`, nodes: [
            {
                label: [
                    `{red.bold:x Input: ''}`,
                    getExternalError(InputErrorTypes.NoTasksAvailable, {}),
                ].join('\n')
            }
        ]
    }, prefix);
    logger.info(o.slice(25, -1));
}

export function reportNoWatchersAvailable() {
    heading('Sorry, there were no watchers available to run');
    const o = archy({
        label: `{yellow:+ input: ''}`, nodes: [
            {
                label: [
                    `{red.bold:x No watchers available}`,
                    getExternalError(InputErrorTypes.NoWatchersAvailable, {}),
                ].join('\n')
            }
        ]
    }, prefix);
    logger.info(o.slice(25, -1));
}

export function reportNoWatchTasksProvided() {
    heading(`Entering interactive mode as you didn't provide a watcher to run`)
}

export interface CrossbowError extends Error {
    _cbError?: boolean
}

function getErrorText(sequenceLabel: string, stats: TaskStats, err: CrossbowError): string {

    if (!err.stack) {
        return err.toString();
    }
    const head = [
        `{red.bold:x} ${sequenceLabel} {yellow:(${duration(stats.duration)})}`,
        `{red.bold:${err.stack.split('\n').slice(0, 1)}}`
    ];
    const body = err.stack.split('\n').slice(1);
    const stack = getStack(body);
    const tail = `- Please see above for any output that may of occurred`;
    if (!stack) {
        return [...head, tail].join('\n');
    }
    return [...head, ...body, tail].join('\n');
}

export function getStack (stack) {
    var StackUtils = require('stack-utils');
    var crossbowInternals = /\/crossbow-cli\/dist*/;
    var crossbowDeps = /\/node_modules\/(?:rx|immutable)\//;
    var stackUtils = new StackUtils({internals: [crossbowInternals, crossbowDeps, ...StackUtils.nodeInternals()]});
    return stackUtils.clean(stack);
}

export function reportSequenceTree(sequence: SequenceItem[], config: CrossbowConfiguration, title, showStats = false) {

    const toLog = getItems(sequence, []);
    const o = archy({label: `{yellow:${title}}`, nodes: toLog}, prefix);

    logger.info(o.slice(25, -1));

    function getItems(items, initial) {
        return items.reduce((acc, item: SequenceItem) => {
            let label = getSequenceLabel(item, config);
            const stats = item.stats;
            if (showStats && item.type === SequenceItemTypes.Task) {
                if (stats.errors.length) {
                    const err = stats.errors[0];
                    label = getErrorText(label, stats, err);
                } else {
                    if (stats.started) {
                        if (stats.completed) {
                            label = `{green:✔} ` + label + ` {yellow:(${duration(stats.duration)})}`;
                        } else {
                            label = `{yellow:x} ` + label + ` {yellow:(didn't complete, ${duration(stats.duration)})}`;
                        }
                    } else {
                        label = `{yellow:x} ${label} {yellow:(didn't start)}`;
                    }
                }
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
    const toLog    = getTasks(tasks, [], 0);
    const archy    = require('archy');
    const output   = archy({label: `{yellow:${title}}`, nodes: toLog}, prefix);

    logger.info(output.slice(25, -1));

    // nl();
    if (errorCount) {
        l(`{red:x} ${errorCount} %s found (see above)`, errorCount === 1 ? 'error' : 'errors');
    } else {
        l(`{ok: } 0 errors found`);
    }

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

function adaptorLabel(task: Task) {
    return `{magenta:[@${task.adaptor}]} ${task.command}`;
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

function maybeErrorLabel (task: Task, label: string): string {
    if (task.errors.length) {
        return `{red.bold:x ${label}}`;
    }
    return label;
}

function duration (ms) {
    return String((Number(ms)/1000).toFixed(2)) + 's';
}
