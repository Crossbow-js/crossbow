import {SequenceItemTypes, SequenceItem} from "../task.sequence.factories";
import {CrossbowConfiguration} from "../config";
import logger from "../logger";
import {Task} from "../task.resolve.d";
import {Meow, CrossbowInput} from "../index";
import {TaskOriginTypes, TaskTypes} from "../task.resolve";
import {relative} from 'path';
import {Watcher} from "../watch.resolve";
import {WatchTask} from "../watch.resolve";

import * as taskErrors from "../task.errors";
import * as watchErrors from "../watch.errors";

import {compile, prefix} from '../logger';
import {WatchTasks} from "../watch.resolve";
import {resolveBeforeTasks} from "../watch.resolve";
import {resolveTasks} from "../task.resolve";
import {CommandTrigger} from "../command.run";
import {TaskReport, TaskReportType} from "../task.runner";
import {countSequenceErrors} from "../task.sequence";
import {InputFiles, InputErrorTypes, _e, isInternal} from "../task.utils";

const l = logger.info;
const baseUrl = 'http://crossbow-cli.io/docs/errors';
const archy = require('archy');

function nl() {
    l(`{gray:-}`);
}

export function reportMissingConfigFile(inputs: InputFiles) {
    if (inputs.invalid.length) {
        heading(`Sorry, there were errors resolving your input files`);
        inputs.invalid.forEach(function (item) {
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
            logger.info(o.slice(26, -1));
        });
    }
}

export function reportSummary(sequence: SequenceItem[], cli: Meow, title: string, config: CrossbowConfiguration, runtime: number) {

    const errorCount = countSequenceErrors(sequence);

    // todo - show a reduced tree showing only errors
    if (config.summary === 'verbose' || errorCount > 0) {
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

export function reportWatcherTriggeredTasksCompleted(index: number, tasks: string[], time: number) {
    l(`{green:✔} [${index}] ${tasks.join(', ')} {yellow:(${duration(time)})}`);
}
export function reportWatcherTriggeredTasks(index: number, tasks: string[]) {
    l(`{yellow:+} [${index}] ${tasks.join(', ')}`);
}

/**
 * Log the task list
 */
export function reportTaskList(sequence: SequenceItem[], cli: Meow, titlePrefix = '', config: CrossbowConfiguration) {

    if (config.summary === 'verbose') {
        const cliInput = cli.input.slice(1).map(x => `'${x}'`).join(' ');
        nl();
        reportSequenceTree(sequence, config, `+ Task Tree for ${cliInput}`);
    } else {
        l('{yellow:+}%s {bold:%s}', titlePrefix, cli.input.slice(1).join(', '));
    }
}

export function reportBeforeTaskList(sequence: SequenceItem[], cli: Meow, config: CrossbowConfiguration) {

    l('{yellow:+} %s {bold:%s}', 'Before tasks for watcher:', cli.input.join(', '));

    if (config.summary === 'verbose') {
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
        logger.info(o.slice(26, -1));
    });
}

export function getWatcherNode(watcher: Watcher) {
    return [
        `{bold:Patterns:} {cyan:${watcher.patterns.map(x => _e(x)).join(', ')}}`,
        `{bold:Tasks:} {cyan:${watcher.tasks.map(x => _e(x)).join(', ')}}`,
    ].join('\n');
}

export function reportTaskErrors(tasks: Task[], cliInput: string[], input: CrossbowInput, config: CrossbowConfiguration) {

    l('{gray.bold:------------------------------------------------}');
    l('{err: } Sorry, there were errors resolving your tasks,');
    l('  So none of them were run.');
    l('{gray.bold:------------------------------------------------}');

    reportErrorsFromCliInput(cliInput, tasks, config);
}

export function reportWatchTaskTasksErrors(tasks: Task[], cliInput: string[], runner: Watcher, config: CrossbowConfiguration) {

    if (runner._tasks.invalid.length) {
        l('{gray.bold:---------------------------------------------------}');
        l(`{err: } Sorry, there were errors when resolving the tasks`);
        l(`  that will be used in the following watcher`);
        l(`  {bold:Watcher name:} {cyan:${runner.parent}}`);
        l(`  {bold:Patterns:} {cyan:${runner.patterns.join(' ')}}`);
        l(`  {bold:Tasks:} {cyan:${runner.tasks.join(' ')}}`);
        reportErrorsFromCliInput(cliInput, tasks, config);
    } else {
        l('{gray.bold:---------------------------------------------------}');
        l(`{ok: } No errors from`);
        l(`  {bold:Watcher name:} {cyan:${runner.parent}}`);
        l(`  {bold:Patterns:} {cyan:${runner.patterns.join(' ')}}`);
        l(`  {bold:Tasks:} {cyan:${runner.tasks.join(' ')}}`);
        if (config.summary === 'verbose') {
            reportErrorsFromCliInput(cliInput, tasks, config);
        }
    }
}

export function reportNoFilesMatched(runner) {
    l('{red:x warning} `{cyan:%s}` did not match any files', runner.patterns.join(' '));
}

export function reportBeforeWatchTaskErrors(watchTasks: WatchTasks, ctx: CommandTrigger): void {

    l('{gray.bold:--------------------------------------------------------------}');
    l('{err: } Sorry, there were errors resolving your {red:`before`} tasks');
    l('  So none of them were run, and no watchers have begun either.');
    l('{gray.bold:--------------------------------------------------------------}');

    watchTasks.all.forEach(function (wt) {
        const cliInput = resolveBeforeTasks(ctx.input, [wt]);
        const tasks = resolveTasks(cliInput, ctx);

        if (ctx.config.summary === 'verbose') {
            return reportTaskTree(tasks.all, ctx.config, `+ Tasks to run before: '${wt.name}'`);
        }

        if (tasks.invalid.length) {
            reportTaskTree(tasks.invalid, ctx.config, `+ Tasks to run before: '${wt.name}'`)
        } else {
            reportTaskTree([], ctx.config, `+ Tasks to run before: '${wt.name}' (no errors)`)
        }
    });
}

export function reportErrorsFromCliInput(cliInput: string[], tasks: Task[], config: CrossbowConfiguration): void {
    cliInput.forEach(function (n, i) {
        reportTaskTree([tasks[i]], config, `+ input: '${n}'`);
    });
}

export function reportWatchTaskErrors(tasks: WatchTask[], cli: Meow, input: CrossbowInput) {

    heading(`Sorry, there were errors resolving your watch tasks`);

    cli.input.slice(1).forEach(function (n, i) {
        logWatchErrors([tasks[i]], '');
        l('{gray.bold:-----------------------------------------------}');
    });
}

export function logWatchErrors(tasks: WatchTask[], indent: string): void {

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
            logger.info(o.slice(26, -1));
        } else {
            const watchTree = task.watchers.map(w => {
                return {
                    label: [
                        compile(`Patterns: [{cyan:${w.patterns.join(', ')}}]`),
                        compile(`Tasks: [{magenta:${w.tasks.join(', ')}}]`)
                    ].join('\n')
                };
            });
            const o = archy({label: `{yellow:+ ${task.name}}`, nodes: watchTree}, prefix);
            logger.info(o.slice(26, -1));
        }
    })
}

export function reportNoTasksProvided() {
    heading(`Entering interactive mode as you didn't provide a task to run`)
}

function heading(title) {
    l('{gray.bold:-' + new Array(title.length).join('-') + "-:");
    l(`${title} {gray.bold::}`);
    l('{gray.bold:-' + new Array(title.length).join('-') + "-:");
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
    logger.info(o.slice(26, -1));
}

export function reportNoWatchersAvailable() {
    heading('Sorry, there were no watchers available to run');
    const o = archy({
        label: `{yellow:+ input: ''}`, nodes: [
            {
                label: [
                    `{red.bold:x Input: ''}`,
                    getExternalError(InputErrorTypes.NoWatchersAvailable, {}),
                ].join('\n')
            }
        ]
    }, prefix);
    logger.info(o.slice(26, -1));
}

export function reportNoWatchTasksProvided() {
    heading(`Entering interactive mode as you didn't provide a watcher to run`)
}

export interface CrossbowError extends Error {
    _cbError?: boolean
}

function getErrorText(sequenceLabel: string, stats, err: CrossbowError): string {

    if (!err.stack) {
        return err.toString();
    }
    const head = [
        `{red:x} ${sequenceLabel} {yellow:(${duration(stats.duration)})}`,
        `{red.bold:${err.stack.split('\n').slice(0, 1)}}`
    ];
    const body = err._cbError ? [] : err.stack.split('\n').slice(1).join('\n');

    const tail = [`- Please see above for any output that occurred`];

    // return [...head, getStack(body), ...tail].join('\n');
    return [...head, body, ...tail].join('\n');
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

    logger.info(o.slice(26, -1));

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
                return `${item.task.rawInput} - ${item.task.taskName} (fn: {bold:${item.fnName}}) with config {bold:${item.subTaskName}}`;
            } else {
                return `${item.task.taskName} with config {bold:${item.subTaskName}}`;
            }
        }
        if (item.fnName) {
            return `${item.task.taskName} (fn: {bold:${item.fnName}})`;
        }
        if (item.task.origin === TaskOriginTypes.NpmScripts) {
            return npmScriptLabel(item.task);
        }
        if (item.task.type === TaskTypes.Adaptor) {
            return adaptorLabel(item.task);
        }
        if (item.task.modules.length) {
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

export function reportTaskTree(tasks, config: CrossbowConfiguration, title, simple = false) {

    let errorCount = 0;
    const toLog    = getTasks(tasks, [], 0);
    const archy    = require('archy');
    const o = archy({label: `{yellow:${title}}`, nodes: toLog}, prefix);

    logger.info(o.slice(26, -1));

    nl();
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
            if (depth < 2) {
                if (isInternal(task.rawInput)) {
                    return acc;
                }
            }

            let nodes = getTasks(task.tasks, [], depth++);
            let label = [getLabel(task), ...errors].join('\n');

            if (simple) {
                if (errorCount) {
                    return acc.concat({
                        label: label,
                        nodes: nodes
                    });
                }
                const displayNodes = (function () {
                    if (config.summary === 'verbose' && task.tasks.length) {
                        return task.tasks.map((x:Task) => `${x.taskName}`);
                    }
                    return [];
                })();
                const displayLabel = (function () {
                    if (task.tasks.length && config.summary !== 'verbose') {
                        return label + ` [${task.tasks.length}]`;
                    }
                    return label;
                })();
                return acc.concat({
                    label: displayLabel,
                    nodes: displayNodes
                });
            }

            if (config.summary === 'verbose') {
                return acc.concat({
                    label: label,
                    nodes: nodes
                });
            }

            if (task.type === TaskTypes.Adaptor ||
                task.type === TaskTypes.RunnableModule) {
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

function getErrors(task) {
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
    const filepath = relative(process.cwd(), task.modules[0]);
    if (task.taskName === filepath) {
        return `${task.taskName}`;
    }
    return `${task.taskName} ${filepath}`;
}

function npmScriptLabel(task: Task) {
    return `{magenta:[npm script]} ${task.command}`;
}

function getLabel(task) {

    if (task.type === TaskTypes.InlineFunction) {
        const fnName = (function () {
        	if (task.inlineFunctions[0].name !== '') {
                return `[Fn: ${task.inlineFunctions[0].name}]`;
            }
            return '[Fn]';
        })();
        if (task.errors.length) {
            return `{red.bold:x ${task.taskName} ${fnName}}`;
        }
        return `${task.taskName} ${fnName}`;
    }

    if (task.origin === TaskOriginTypes.NpmScripts) {
        return npmScriptLabel(task);
    }

    if (task.type === TaskTypes.Group) {
        if (task.errors.length) {
            return `{red.bold:x ${task.taskName}}`;
        }
        return `{bold:${task.taskName}}`;
    }

    if (task.type === TaskTypes.RunnableModule) {
        if (task.errors.length) {
            return `{red.bold:x ${task.rawInput}}`;
        }
        return `{cyan:${task.taskName}}`;
    }

    if (task.type === TaskTypes.Adaptor) {
        if (task.errors.length) {
            return `{red.bold:x ${task.rawInput}}`;
        }
        return adaptorLabel(task);
    }

    return `${task.taskName}}`;
}

function duration (ms) {
    return String((Number(ms)/1000).toFixed(2)) + 's';
}
