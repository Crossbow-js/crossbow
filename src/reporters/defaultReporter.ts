import {SequenceItemTypes, SequenceItem} from "../task.sequence.factories";
import {CrossbowConfiguration} from "../config";
import logger from "../logger";
import {Task} from "../task.resolve";
import * as cbErrors from "../task.errors";
import {Meow, CrossbowInput} from "../index";
import {SubtaskNotProvidedError} from "../task.errors";
import {TaskOriginTypes, TaskTypes} from "../task.resolve";
const baseUrl = 'http://crossbow-cli.io/docs/errors';
import {relative} from 'path';
import {FlagNotProvidedError} from "../task.errors";
import {Watcher} from "../watch.resolve";
import {WatchTask} from "../watch.resolve";
import {WatchTaskErrorTypes} from "../watch.errors";
import {WatchTaskNameNotFoundError} from "../watch.errors";
const l = logger.info;
import {compile, prefix} from '../logger';
import {TaskErrorTypes} from "../task.errors";

function sectionTitle (title, secondary) {

    const lineLength = new Array(secondary.length + title.length).join('-');

    l('');
    l('{gray:----' + lineLength);
    l("{yellow:+ %s {cyan:%s}", title, secondary);
    l('{gray:----' + lineLength);
}
export function summary (
    sequence: SequenceItem[],
    cli: Meow,
    input: CrossbowInput,
    config: CrossbowConfiguration,
    runtime: number
) {

    if (config.summary !== 'short') {
        const cliInput = cli.input.slice(1).map(x => `'${x}'`).join(' ');
        const lineLength = new Array(cliInput.length).join('-');
        sectionTitle('Summary from the input', cliInput);
        logTaskCompletion(sequence, '');
        l('{gray:---------------------------' + lineLength);
    }

    l('');
    l('{ok: } Total: {yellow:%sms}', runtime);
    l('');
}

/**
 * Log all tasks from the sequence
 * @param sequence
 * @param indent
 */
function logTaskCompletion (sequence: SequenceItem[], indent: string) {
    const localIndent = indent.length ? indent + ' ': '';
    sequence.forEach(function (item) {
        if (item.type === SequenceItemTypes.Task) {
            if (item.subTaskName) {
                return l('{gray:%s}{ok: } %s (with config: {bold:%s}) {yellow:%sms}', localIndent, item.task.taskName, item.subTaskName, item.duration);
            } else {

                if (item.task.origin === TaskOriginTypes.NpmScripts) {
                    return l('{gray:%s}{ok: } {magenta:[npm script]} %s {yellow:%sms}', localIndent, item.task.command, item.duration);
                } else {
                    return l('{gray:%s}{ok: } %s {yellow:%sms}', localIndent, item.task.taskName, item.duration);
                }
            }
        }
        l('{gray:%s}{white.bold:[%s]} {gray:%s}', localIndent, item.taskName, SequenceItemTypes[item.type]);
        logTaskCompletion(item.items, indent + '-');
    });
}

/**
 * Log the tree of tasks about to be run
 * @param sequence
 * @param indent
 */
function logTaskTree (sequence: SequenceItem[], indent: string) {
    const localIndent = indent.length ? indent + ' ': '';
    sequence.forEach(function (item) {
        if (item.type === SequenceItemTypes.Task) {
            let name = item.task.taskName;
            if (item.fnName !== '') {
                name = `${name} fn: ${item.fnName}`;
            }
            if (item.subTaskName) {
                l('{gray:%s}%s (with config: {bold:%s})', localIndent, name, item.subTaskName);
            } else {
                if (item.task.origin === TaskOriginTypes.NpmScripts) {
                    return l('{gray:%s}{ok: } {magenta:[npm script]} %s', localIndent, item.task.command);
                } else {
                    return l('{gray:%s}{ok: } %s', localIndent, item.task.taskName);
                }
            }
            return;
        }
        l('{gray:%s}{white.bold:[%s]} {gray:%s}', localIndent, item.taskName, SequenceItemTypes[item.type]);
        logTaskTree(item.items, indent + '-');
    });
}

/**
 * Log the task list
 */
export function reportTaskList (sequence: SequenceItem[],
                                cli: Meow,
                                input: CrossbowInput,
                                config: CrossbowConfiguration) {

    l('');
    l('{yellow:+} {bold:%s}', cli.input.slice(1).join(', '));

    if (config.summary !== 'verbose') {
        return;
    }

    const cliInput = cli.input.slice(1).map(x => `'${x}'`).join(' ');
    reportSequenceTree(sequence, config, ` `);
}
export function reportTaskErrors (tasks: Task[],
                                  cli: Meow,
                                  input: CrossbowInput,
                                  config: CrossbowConfiguration) {

    l('{gray.bold:------------------------------------------------}');
    l('{err: } Sorry, there were errors resolving your tasks,');
    l('{red:-} So none of them were run.');
    //l('{red:-} To see all errors, run `{cyan:crossbow tree}`');
    l('{gray.bold:------------------------------------------------}');

    cli.input.slice(1).forEach(function (n, i) {
        reportTaskTree([tasks[i]], config, `+ input: '${n}'`);
    });
}
export function reportWatchTaskErrors (tasks: WatchTask[],
                                  cli: Meow,
                                  input: CrossbowInput,
                                  config: CrossbowConfiguration) {

    l('{gray.bold:------------------------------------------------}');
    l('{err: } Sorry, there were errors resolving your tasks');
    l('{err: } So none of them were run.');
    l('{gray.bold:------------------------------------------------}');

    cli.input.slice(1).forEach(function (n, i) {
    	l("{gray:+ input: {gray.bold:'%s'}", n);
        logWatchErrors([tasks[i]], '');
        l('{gray.bold:-----------------------------------------------}');
    });
}

export function logWatchErrors(tasks: WatchTask[], indent: string): void {

    tasks.forEach(function (task) {
        if (task.errors.length) {
            const logOnlyModuleNotFoundErrors = task.errors.filter(x => x.type === WatchTaskErrorTypes.WatchTaskNameNotFound);
            logMultipleErrors(task, task.errors, WatchTaskErrorTypes, indent);
        }
    })
}

export function reportNoTasksProvided() {
    l("{gray:-------------------------------------------------------------");
    l("Entering {bold:interactive mode} as you didn't provide a task to run");
    l("{gray:-------------------------------------------------------------");
}

export function reportSequenceTree (sequence: SequenceItem[], config: CrossbowConfiguration, title) {

    const toLog = getTasks(sequence, []);
    const archy = require('archy');
    const o = archy({label:`{yellow:${title}}`, nodes:toLog}, prefix);

    logger.info(o.slice(26));

    function getTasks (tasks, initial) {
        return tasks.reduce((acc, task: SequenceItem) => {
            let label = getSequenceLabel(task);
            let nodes = getTasks(task.items, []);

            //if (config.summary === 'verbose') {
            //    return acc.concat({
            //        label: label,
            //        nodes: nodes
            //    });
            //}
            //
            //if (task.type === TaskTypes.Adaptor ||
            //    task.type === TaskTypes.Runnable) {
            //    if (task.errors.length) {
            //        return acc.concat({
            //            label: label,
            //            nodes: []
            //        });
            //    }
            //    return acc;
            //}
            //
            return acc.concat({
                label: label,
                nodes: nodes
            });

        }, initial);
    }
}

function getSequenceLabel (item: SequenceItem) {
    if (item.type === SequenceItemTypes.Task) {
        if (item.subTaskName) {
            return `${item.task.taskName} (fn: {bold:${item.fnName}}) with config {bold:${item.subTaskName}}`;
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
    return compile(`{bold:[${item.taskName}]} {yellow:[${SequenceItemTypes[item.type]}]}`);
}

export function reportTaskTree (tasks, config: CrossbowConfiguration, title) {

    const toLog = getTasks(tasks, []);
    const archy = require('archy');
    const o = archy({label:`{yellow:${title}}`, nodes:toLog}, prefix);

    logger.info(o.slice(26));

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
    if (task.errors[0].type === TaskErrorTypes.ModuleNotFound) {
        return [getSingleError(task.errors[0], task)];
    }
    return task.errors.map(error => getSingleError(error, task));
}

function getSingleError(error, task) {
    const type = TaskErrorTypes[error.type];
    return [
        compile(`{red:-} {bold:Error Type:}  ${type}`),
        ...errorHandlers[TaskErrorTypes[error.type]].call(null, task, error),
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

/**
 * @param task
 * @param errors
 * @param indent
 */
function logMultipleErrors (task, errors, lookup, indent) {
    errors.forEach(function (error) {
        const errorType = lookup[error.type];
        if (errorHandlers[errorType]) {
            l("{red:-%s} {err: } {bold:Error Type}:  {underline:%s}", indent, errorType);
            errorHandlers[errorType](task, error, indent + '-');
            l("{red:-%s} {err: } {bold:Documentation}: {underline:%s/{bold.underline:%s}}", indent, baseUrl, errorType);
        } else {
            console.error('No reporter for error type', errorType);
        }
    });
}

const errorHandlers = {
    AdaptorNotFound: function (task, error, indent) {
        return [
            compile(`{red:-} {bold:Description}: {cyan:'${task.adaptor}'} Not supported.`)
        ];
    },
    ModuleNotFound: function (task: Task, error, indent) {
        return [
            compile(`{red:-} {bold:Description}: {cyan:'${task.taskName}'} was not found.`)
        ];
    },
    SubtaskNotFound: function (task: Task, error: cbErrors.SubtaskNotFoundError) {
        return [
            compile(`{red:-} {bold:Description}: Configuration under the path {yellow:${task.taskName}} -> {yellow:${error.name}} was not found.`),
            compile(`  This means {cyan:'${task.rawInput}'} is not a valid way to run a task.`)
        ];
    },
    SubtaskNotProvided: function (task: Task, error: cbErrors.SubtaskNotProvidedError) {
        return [
            compile('{red:-} {bold:Description}: Colon used after task, but config key missing.'),
            compile(`  When you provide a task name, followed by a {cyan::} (colon)`),
            compile(`  Crossbow expects the next bit to have a key name that matches`),
            compile(`  something in your config, eg: {cyan:${task.taskName}}:{yellow:dev}`),
        ];
    },
    SubtasksNotInConfig: function (task: Task, error: cbErrors.SubtasksNotInConfigError) {
        return [
            compile(`{red:-} {bold:Description}: Configuration not provided for this task!`),
            compile(`  Your tried to run {cyan:'${task.rawInput}'}, but it wont work because`),
            compile(`  when you use the {cyan:<task>}:{yellow:<sub-task>} syntax, Crossbow looks in your`),
            compile(`  configuration for a key that matches the {yellow:sub-task} name.`),
            compile(`  In this case you would need {cyan:${task.taskName}.${error.name}}`)
        ]
    },
    SubtaskWildcardNotAvailable: function (task: Task, error: cbErrors.SubtaskWildcardNotAvailableError) {
        return [
            compile('{red:-} {bold:Description}: Configuration not provided for this task!'),
            compile(`  Because you dont have any configuration matching this task name`),
            compile(`  it means you cannot use {cyan:${task.rawInput}} syntax`)
        ];
        //l("{red:%s} {err: } {bold:Description}: {cyan:'%s'} Configuration not provided for this task", indent, task.rawInput);
    },
    FlagNotProvided: function (task: Task, error: FlagNotProvidedError, indent) {
        return [
            compile(`{red:-} {bold:Description}: {cyan:'${task.rawInput}'} is missing a valid flag (such as {yellow:'p'})`),
            compile(`  Should be something like: {cyan:'${task.taskName}@p'}`)
        ]
    },
    WatchTaskNameNotFound: function (task: WatchTask, error: WatchTaskNameNotFoundError, indent) {
        l("{red:%s} {err: } {bold:Description}: {cyan:'%s'} Not found in your configuration", indent, task.name);
    }
};

