import {SequenceItemTypes, SequenceItem} from "../task.sequence.factories";
import {CrossbowConfiguration} from "../config";
import logger from "../logger";
import {Task} from "../task.resolve";
import {SubtaskNotFoundError, TaskErrorTypes} from "../task.errors";
import {Meow, CrossbowInput} from "../index";
import {SubtaskNotProvidedError} from "../task.errors";
import {TaskOriginTypes} from "../task.resolve";
const modulePredicate = (x) => x.type === TaskErrorTypes.ModuleNotFound;
const baseUrl = 'http://crossbow-cli.io/docs/errors';

function sectionTitle (title, secondary) {

    const lineLength = new Array(secondary.length + title.length).join('-');

    logger.info('');
    logger.info('{gray:----' + lineLength);
    logger.info("{yellow:+ %s {cyan:%s}", title, secondary);
    logger.info('{gray:----' + lineLength);
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
        logger.info('{gray:---------------------------' + lineLength);
    }

    logger.info('');
    logger.info('{ok: } Total: {yellow:%sms}', runtime);
    logger.info('');
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
                return logger.info('{gray:%s}{ok: } %s (with config: {bold:%s}) {yellow:%sms}', localIndent, item.task.taskName, item.subTaskName, item.duration);
            } else {

                if (item.task.origin === TaskOriginTypes.NpmScripts) {
                    return logger.info('{gray:%s}{ok: } {magenta:[npm]} %s {yellow:%sms}', localIndent, item.task.command, item.duration);
                } else {
                    return logger.info('{gray:%s}{ok: } %s {yellow:%sms}', localIndent, item.task.taskName, item.duration);
                }
            }
        }
        logger.info('{gray:%s}{white.bold:[%s]} {gray:%s}', localIndent, item.taskName, SequenceItemTypes[item.type]);
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
                logger.info('{gray:%s}%s (with config: {bold:%s})', localIndent, name, item.subTaskName);
            } else {
                if (item.task.origin === TaskOriginTypes.NpmScripts) {
                    return logger.info('{gray:%s}{ok: } {magenta:[npm]} %s', localIndent, item.task.command);
                } else {
                    return logger.info('{gray:%s}{ok: } %s', localIndent, item.task.taskName);
                }
            }
            return;
        }
        logger.info('{gray:%s}{white.bold:[%s]} {gray:%s}', localIndent, item.taskName, SequenceItemTypes[item.type]);
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

    logger.info('');
    logger.info('{yellow:+} {bold:%s}', cli.input.slice(1).join(', '));

    if (config.summary !== 'short') {
        const cliInput = cli.input.slice(1).map(x => `'${x}'`).join(' ');
        const lineLength = new Array(cliInput.length).join('-');
        sectionTitle('Task tree for the input', cliInput);
        logTaskTree(sequence, '');
        logger.info('{gray:---------------------------' + lineLength);
    }
}

export function reportTaskErrorLinks (tasks: Task[],
                                  cli: Meow,
                                  input: CrossbowInput,
                                  config: CrossbowConfiguration) {
    logger.info('');
    logger.info('Documentation links for the errors above');
    logger.info('');
    logLinks(tasks);
    function logLinks(tasks) {
        tasks.forEach(function (item) {
            if (item.errors.length) {
                item.errors.forEach(function (error) {
                    logger.info('  {underline:%s/%s}', baseUrl, TaskErrorTypes[error.type]);
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

    logger.info('{gray.bold:------------------------------------------------}');
    logger.info('{err: } Sorry, there were errors resolving your tasks,');
    logger.info('{err: } So none of them were run.');
    logger.info('{gray.bold:------------------------------------------------}');

    cli.input.slice(1).forEach(function (n, i) {
    	logger.info("{gray:+ input: {gray.bold:'%s'}", n);
        logErrors([tasks[i]], '');
        logger.info('{gray.bold:-----------------------------------------------}');
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
            logger.info('{gray.bold:-%s} {bold:[%s]}', indent, task.taskName);
            logErrors(task.tasks, indent += '-');
        } else {
            if (!logged) {
                logger.info('{gray.bold:-%s} {ok: } %s', indent, task.taskName);
            }
        }
    })
}

export function reportNoTasksProvided() {
    logger.info("{gray:-------------------------------------------------------------");
    logger.info("Entering {bold:interactive mode} as you didn't provide a task to run");
    logger.info("{gray:-------------------------------------------------------------");
}

export function reportTree (tasks, title) {

    var taskCount = 0;
    var taskErrors = 0;
    var taskValid = 0;
    sectionTitle(title, '');
    logTasks(tasks, '');
    logger.info('');
    logger.info('{red:%s} error%s found.', taskErrors, (taskErrors > 1 || taskErrors === 0) ? 's' : '');
    logger.info('');

    function logTasks(tasks, indent) {
        tasks.forEach(function (task) {
            if (task.tasks.length) {
                logger.info('{gray.bold:-%s} {bold:%s}', indent, task.taskName);
            } else {
                taskCount += 1;
                if (task.errors.length) {
                    logger.info('{red:-%s x {red.bold:%s}}', indent, task.taskName);
                } else {
                    taskValid += 1;
                    if (task.origin === TaskOriginTypes.NpmScripts) {
                        logger.info('{gray.bold:-%s} %s', indent, task.command);
                    } else {
                        logger.info('{gray.bold:-%s} %s', indent, task.taskName);
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
        const errorType = TaskErrorTypes[error.type];
        if (errorHandlers[errorType]) {
            errorHandlers[errorType](task, error, indent + '-');
            logger.info("{red:%s} {err: } Docs: {underline:%s/{bold.underline:%s}}", indent + '-', baseUrl, errorType);
            logger.info('');
        } else {
            console.error('No reporter for error type', errorType);
        }
    });
}

const errorHandlers = {
    AdaptorNotFound: function (task, error, indent) {
        logger.info("{red:%s} {err: } Desc: {cyan:'%s'} Adaptor not supported", indent, task.adaptor);
    },
    ModuleNotFound: function (task: Task, error, indent) {
        logger.info("{red:%s} {err: } Desc: {cyan:'%s'} Task / Module not found", indent, task.rawInput);
    },
    SubtaskNotFound: function (task: Task, error: SubtaskNotFoundError, indent) {
        logger.info("{red:%s} {err: } Desc: {cyan:'%s'} Sub-Task {yellow:'%s'} not found", indent, task.rawInput, error.name);
    },
    SubtaskNotProvided: function (task: Task, error: SubtaskNotProvidedError, indent) {
        logger.info("{red:%s} {err: } Desc: {cyan:'%s'} Sub-Task not provided", indent, task.rawInput, error.name);
    },
    SubtasksNotInConfig: function (task: Task, error: SubtaskNotProvidedError, indent) {
        logger.info("{red:%s} {err: } Desc: {cyan:'%s'} Configuration not provided for this task", indent, task.rawInput);
        logger.info("{red:%s} {err: } so you cannot use {cyan:<task>}:{yellow:*} syntax", indent);
    },
    FlagNotProvided: function (task: Task, error: SubtaskNotProvidedError, indent) {
        logger.info("{red:%s} {err: } Desc: {cyan:'%s'} is missing a valid flag (such as {yellow:'p'}, for example)", indent, task.rawInput);
        logger.info("{red:%s} {err: } Desc: Should be something like: {cyan:'%s@p'}", indent, task.taskName);
    }
};

