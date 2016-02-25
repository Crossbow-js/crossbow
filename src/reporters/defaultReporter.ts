import {SequenceItemTypes, SequenceItem} from "../task.sequence.factories";
import {CrossbowConfiguration} from "../config";
import logger from "../logger";
import {Task} from "../task.resolve";
import * as cbErrors from "../task.errors";
import {Meow, CrossbowInput} from "../index";
import {SubtaskNotProvidedError} from "../task.errors";
import {TaskOriginTypes} from "../task.resolve";
const modulePredicate = (x) => x.type === cbErrors.TaskErrorTypes.ModuleNotFound;
const baseUrl = 'http://crossbow-cli.io/docs/errors';
import {relative} from 'path';
import {FlagNotProvidedError} from "../task.errors";
const l = logger.info;

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
                    return l('{gray:%s}{ok: } {magenta:[npm scripts]} %s', localIndent, item.task.command);
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

    if (config.summary !== 'short') {
        const cliInput = cli.input.slice(1).map(x => `'${x}'`).join(' ');
        const lineLength = new Array(cliInput.length).join('-');
        sectionTitle('Task tree for the input', cliInput);
        logTaskTree(sequence, '');
        l('{gray:---------------------------' + lineLength);
    }
}

export function reportTaskErrorLinks (tasks: Task[],
                                  cli: Meow,
                                  input: CrossbowInput,
                                  config: CrossbowConfiguration) {
    l('');
    l('Documentation links for the errors above');
    l('');
    logLinks(tasks);
    function logLinks(tasks) {
        tasks.forEach(function (item) {
            if (item.errors.length) {
                item.errors.forEach(function (error) {
                    l('  {underline:%s/%s}', baseUrl, cbErrors.TaskErrorTypes[error.type]);
                })
            }
            if (item.tasks) {
                logLinks(item.tasks);
            }
        })
    }
}
export function reportTaskErrors (tasks: Task[],
                                  cli: Meow,
                                  input: CrossbowInput,
                                  config: CrossbowConfiguration) {

    l('{gray.bold:------------------------------------------------}');
    l('{err: } Sorry, there were errors resolving your tasks,');
    l('{err: } So none of them were run.');
    l('{gray.bold:------------------------------------------------}');

    cli.input.slice(1).forEach(function (n, i) {
    	l("{gray:+ input: {gray.bold:'%s'}", n);
        logErrors([tasks[i]], '');
        l('{gray.bold:-----------------------------------------------}');
    });
}

export function logErrors(tasks, indent) {

    tasks.forEach(function (task) {
        var logged = false;
        if (task.errors.length) {
            /**
             * If one of the errors is a module not found error, all other errors
             * don't make sense
             * @type {boolean}
             */
            logged = true;
            const logOnlyModuleNotFoundErrors = task.errors.some(modulePredicate);

            if (logOnlyModuleNotFoundErrors) {
                logMultipleErrors(task, task.errors.filter(modulePredicate), indent);
            } else {
                logMultipleErrors(task, task.errors, indent);
            }
        }
        if (task.tasks.length) {
            l('{gray.bold:-%s} {bold:[%s]}', indent, task.taskName);
            logErrors(task.tasks, indent += '-');
        } else {
            if (!logged) {
                l('{gray.bold:-%s} {ok: } %s', indent, task.taskName);
            }
        }
    })
}

export function reportNoTasksProvided() {
    l("{gray:-------------------------------------------------------------");
    l("Entering {bold:interactive mode} as you didn't provide a task to run");
    l("{gray:-------------------------------------------------------------");
}

export function reportTree (tasks, config: CrossbowConfiguration, title) {

    var taskCount = 0;
    var taskErrors = 0;
    var taskValid = 0;
    sectionTitle(title, '');
    logTasks(tasks, '');
    l('');
    l('{red:%s} error%s found.', taskErrors, (taskErrors > 1 || taskErrors === 0) ? 's' : '');
    l('');

    function logTasks(tasks, indent) {
        tasks.forEach(function (task) {
            if (task.tasks.length) {
                l('{gray.bold:-%s} {bold:[%s]}', indent, task.taskName);
            } else {
                taskCount += 1;
                if (task.errors.length) {
                    l('{red:-%s x {red.bold:%s}}', indent, task.taskName);
                } else {
                    taskValid += 1;
                    if (config.summary !== 'verbose') {
                        return;
                    }
                    if (task.origin === TaskOriginTypes.NpmScripts) {
                        l('{gray.bold:-%s} %s', indent, task.command);
                    } else {
                        if (task.adaptor) {
                            l('{gray.bold:-%s} %s {magenta:[@%s adaptor]}', indent, task.taskName, task.adaptor);
                        }
                        if (task.modules.length) {
                            l('{gray.bold:-%s} %s [{cyan:%s}]', indent, task.taskName, relative(process.cwd(),task.modules[0]));
                        }
                    }
                }
            }
            if (task.errors.length) {
                taskErrors += task.errors.length;
                logMultipleErrors(task, task.errors, indent);
            }
            if (task.tasks.length) {
                logTasks(task.tasks, indent + '-');
            }
        });
    }
}

/**
 * @param task
 * @param errors
 * @param indent
 */
function logMultipleErrors (task, errors, indent) {
    errors.forEach(function (error) {
        const errorType = cbErrors.TaskErrorTypes[error.type];
        if (errorHandlers[errorType]) {
            errorHandlers[errorType](task, error, indent + '-');
            l("{red:%s} {err: } {bold:Documentation}: {underline:%s/{bold.underline:%s}}", indent + '-', baseUrl, errorType);
            l('');
        } else {
            console.error('No reporter for error type', errorType);
        }
    });
}

function genericSubtaskErrorInfo (indent) {
    l("{red:%s} {err: } When your task name ends with a colon, Crossbow expects", indent);
    l("{red:%s} {err: } you to provide a key to a config object, eg: {cyan:my-task}:{cyan:config}", indent);
}

const errorHandlers = {
    AdaptorNotFound: function (task, error, indent) {
        l("{red:%s} {err: } {bold:Description}: {cyan:'%s'} Adaptor not supported", indent, task.adaptor);
    },
    ModuleNotFound: function (task: Task, error, indent) {
        l("{red:%s} {err: } {bold:Description}: {cyan:'%s'} Task / Module not found", indent, task.rawInput);
    },
    SubtaskNotFound: function (task: Task, error: cbErrors.SubtaskNotFoundError, indent) {
        l("{red:%s} {err: } {bold:Description}: {cyan:'%s'} Sub-Task {yellow:'%s'} not found", indent, task.rawInput, error.name);
    },
    SubtaskNotProvided: function (task: Task, error: cbErrors.SubtaskNotProvidedError, indent) {
        l("{red:%s} {err: } {bold:Description}: {cyan:'%s'} Sub-Task not provided", indent, task.rawInput, error.name);
        genericSubtaskErrorInfo(indent);
    },
    SubtasksNotInConfig: function (task: Task, error: cbErrors.SubtasksNotInConfigError, indent) {
        l("{red:%s} {err: } {bold:Description}: {cyan:'%s'} Configuration not provided for this task", indent, task.rawInput);
        genericSubtaskErrorInfo(indent);
    },
    SubtaskWildcardNotAvailable: function (task: Task, error: cbErrors.SubtaskWildcardNotAvailableError, indent) {
        l("{red:%s} {err: } {bold:Description}: {cyan:'%s'} Configuration not provided for this task", indent, task.rawInput);
        l("{red:%s} {err: } so you cannot use {cyan:<task>}:{yellow:*} syntax", indent);
    },
    FlagNotProvided: function (task: Task, error: FlagNotProvidedError, indent) {
        l("{red:%s} {err: } {bold:Description}: {cyan:'%s'} is missing a valid flag (such as {yellow:'p'}, for example)", indent, task.rawInput);
        l("{red:%s} {err: } {bold:Description}: Should be something like: {cyan:'%s@p'}", indent, task.taskName);
    }
};

