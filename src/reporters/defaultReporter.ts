import {SequenceItemTypes, SequenceItem} from "../task.sequence.factories";
import {CrossbowConfiguration} from "../config";
import logger from "../logger";
import {Task} from "../task.resolve";
import {Meow, CrossbowInput} from "../index";
import {TaskOriginTypes, TaskTypes} from "../task.resolve";
import {relative} from 'path';
import {Watcher} from "../watch.resolve";
import {WatchTask} from "../watch.resolve";

import * as taskErrors from "../task.errors";
import * as watchErrors from "../watch.errors";

import {compile, prefix} from '../logger';
import {WatchTasks} from "../watch.resolve";
import {Tasks} from "../task.resolve";
import {resolveBeforeTasks} from "../watch.resolve";
import {resolveTasks} from "../task.resolve";
import {WatchTrigger} from "../command.watch";
import {CommandTrigger} from "../command.run";

const l = logger.info;
const baseUrl = 'http://crossbow-cli.io/docs/errors';
const archy = require('archy');

function nl () {
    l(`{gray:-}`);
}

export function reportSummary (sequence: SequenceItem[], cli: Meow, input: CrossbowInput, config: CrossbowConfiguration, runtime: number) {

    const errorCount = countErrors(sequence);

    if (config.summary === 'verbose') {
        const cliInput = cli.input.slice(1).map(x => `'${x}'`).join(' ');
        nl();
        reportSequenceTree(sequence, config, `+ Results from ${cliInput}`, true);
    }

    if (errorCount > 0) {
        nl();
        cli.input.slice(1).forEach(function (input) {
            const match = getSequenceItemThatMatchesCliInput(sequence, input);
            const errors = countErrors(match);
            if (errors > 0) {
                l(`{red:x} input: {yellow:${input}} caused an error`);
            }
        });
        if (config.summary !== 'verbose') {
            l(`  (use the -v flag for more information)`);
        }
        nl();
        if (config.fail) {
            l(`{red:x} Total: {yellow:%sms} (${errorCount} %s)`, runtime, errorCount === 1 ? 'error' : 'errors');
        } else {
            l(`{yellow:x} Total: {yellow:%sms} (${errorCount} %s)`, runtime, errorCount === 1 ? 'error' : 'errors');
        }
    } else {
        nl();
        l('{ok: } Total: {yellow:%sms}', runtime);
    }
}

function getSequenceItemThatMatchesCliInput (sequence: SequenceItem[], input: string): SequenceItem[] {
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

/**
 * Log the task list
 */
export function reportTaskList (sequence: SequenceItem[], cli: Meow, titlePrefix = '', config: CrossbowConfiguration) {

    if (config.summary === 'verbose') {
        const cliInput = cli.input.slice(1).map(x => `'${x}'`).join(' ');
        nl()
        reportSequenceTree(sequence, config, `+ Task Tree for ${cliInput}`);
    } else {
        l('{yellow:+} %s {bold:%s}', titlePrefix, cli.input.slice(1).join(', '));
    }
}

export function reportWatchers (watchTasks: WatchTask[], config: CrossbowConfiguration) {
    l(`Starting the follwing watchers:`);
    watchTasks.forEach(function (watchTask) {
        const o = archy({
            label:`{yellow:+ input: '${watchTask.name}'}`, nodes: watchTask.watchers.map(getWatcherNode)
        }, prefix);
        logger.info(o.slice(26, -1));
    });
}

export function getWatcherNode (watcher: Watcher) {
    return [
        `{bold:Patterns:} {cyan:${watcher.patterns.join(', ')}}`,
        `{bold:Tasks:} {cyan:${watcher.tasks.join(', ')}}`,
    ].join('\n');
}

/**
 * Log the task list
 */
export function reportTaskList2 (sequence: SequenceItem[], cliInput: string[], ctx: CommandTrigger) {

    if (ctx.config.summary !== 'verbose') {
        l('{yellow:+} {bold:%s}', cliInput.join(', '));
        return;
    }

    const cliInputOutput = cliInput.slice(1).map(x => `'${x}'`).join(' ');

    reportSequenceTree(sequence, ctx.config, `+ Task Tree for ${cliInputOutput}`);
}

export function reportTaskErrors (tasks: Task[], cliInput: string[], input: CrossbowInput, config: CrossbowConfiguration) {

    l('{gray.bold:------------------------------------------------}');
    l('{err: } Sorry, there were errors resolving your tasks,');
    l('  So none of them were run.');
    l('{gray.bold:------------------------------------------------}');

    reportErrorsFromCliInput(cliInput, tasks, config);
}

export function reportWatchTaskTasksErrors (tasks: Task[], cliInput: string[], runner: Watcher, config: CrossbowConfiguration) {

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

export function reportNoFilesMatched (runner) {
    l('{red:x warning} `{cyan:%s}` did not match any files', runner.patterns.join(' '));
}

export function reportBeforeWatchTaskErrors (watchTasks: WatchTasks, ctx: WatchTrigger ): void {

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

export function reportWatchTaskErrors (tasks: WatchTask[], cli: Meow, input: CrossbowInput) {

    l('{gray.bold:-----------------------------------------------------}');
    l('{err: } Sorry, there were errors resolving your watch tasks');
    l('{gray.bold:-----------------------------------------------------}');

    cli.input.slice(1).forEach(function (n, i) {
        logWatchErrors([tasks[i]], '');
        l('{gray.bold:-----------------------------------------------}');
    });
}

export function logWatchErrors(tasks: WatchTask[], indent: string): void {

    tasks.forEach(function (task: WatchTask) {
        if (task.errors.length) {
            const o = archy({
                label:`{yellow:+ input: '${task.name}'}`, nodes:[
                    {
                        label: [
                            `{red.bold:x [${task.name}]}`,
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
            const o = archy({label:`{yellow:+ ${task.name}}`, nodes:watchTree}, prefix);
            logger.info(o.slice(26, -1));
        }
    })
}

export function reportNoTasksProvided() {
    l("{gray:-------------------------------------------------------------");
    l("Entering {bold:interactive mode} as you didn't provide a task to run");
    l("{gray:-------------------------------------------------------------");
}

export function reportNoWatchTasksProvided() {
    l("{gray:-------------------------------------------------------------");
    l("You didn't provide a watch-task to run");
    l("{gray:-------------------------------------------------------------");
}

export function reportSequenceTree (sequence: SequenceItem[], config: CrossbowConfiguration, title, showStats = false) {

    const toLog = getItems(sequence, []);
    const o     = archy({label:`{yellow:${title}}`, nodes:toLog}, prefix);

    logger.info(o.slice(26, -1));

    function getItems (items, initial) {
        return items.reduce((acc, item: SequenceItem) => {
            let label = getSequenceLabel(item, config);
            const stats = item.stats;
            if (showStats && item.type === SequenceItemTypes.Task) {
                if (stats.errors.length) {
                    label = `{red:x} ${label} {yellow:(${stats.duration}ms)}`;
                } else {
                    if (!stats.started) {
                        label = `{yellow:x (didn't start)} ` + label;
                    } else {
                        label = `{green:✔} ` + label + ` {yellow:(${stats.duration}ms)}`;
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

function getSequenceLabel (item: SequenceItem, config: CrossbowConfiguration) {
    if (item.type === SequenceItemTypes.Task) {
        if (item.subTaskName) {
            if (item.fnName) {
                return `${item.task.taskName} (fn: {bold:${item.fnName}}) with config {bold:${item.subTaskName}}`;
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
        return item.task.taskName;
    }
    if (item.items.length === 1) {
        return compile(`{bold:[${item.taskName}]}`);
    } else {
        return compile(`{bold:[${item.taskName}]} {yellow:${SequenceItemTypes[item.type]}}`);
    }
}

export function reportTaskTree (tasks, config: CrossbowConfiguration, title) {

    const toLog = getTasks(tasks, []);
    const archy = require('archy');
    const o = archy({label:`{yellow:${title}}`, nodes:toLog}, prefix);

    logger.info(o.slice(26, -1));

    function getTasks (tasks, initial) {
        return tasks.reduce((acc, task) => {
            let label = [getLabel(task), ...getErrors(task)].join('\n');
            let nodes = getTasks(task.tasks, []);

            if (config.summary === 'verbose') {
                return acc.concat({
                    label: label,
                    nodes: nodes
                });
            }

            if (task.type === TaskTypes.Adaptor ||
                task.type === TaskTypes.Runnable) {
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

function getErrors (task) {
    if (!task.errors.length) {
        return [];
    }
    if (task.errors[0].type === taskErrors.TaskErrorTypes.ModuleNotFound) {
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

function getExternalError (type, error, task) {
    return [
        compile(`{red:-} {bold:Error Type:}  ${type}`),
        ...require('./error.' + type).apply(null, [task, error]),
        compile(`{red:-} {bold:Documentation}: {underline:${baseUrl}/{bold.underline:${type}}}`),
    ].join('\n');
}

function adaptorLabel (task) {
    return `{magenta:[@${task.adaptor}]} {cyan:${task.command}}`;
}

function npmScriptLabel(task:Task) {
    return `{magenta:[npm script]} {cyan:${task.command}}`;
}

function getLabel (task) {

    if (task.origin === TaskOriginTypes.NpmScripts) {
        return npmScriptLabel(task);
    }

    if (task.type === TaskTypes.Group) {
        if (task.errors.length) {
            return `{red.bold:x [${task.taskName}]}`;
        }
        return `{bold:[${task.taskName}]}`;
    }

    if (task.type === TaskTypes.Runnable) {
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

function countErrors (items: SequenceItem[]) {
    return items.reduce((acc, item) => {
        if (item.type === SequenceItemTypes.Task) {
            if (item.stats.errors.length) {
                return acc + 1;
            } else {
                return acc;
            }
        }
        return acc + countErrors(item.items);
    }, 0);
}
