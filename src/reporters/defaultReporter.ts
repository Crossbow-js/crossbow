import {SequenceItemTypes, SequenceItem} from "../task.sequence.factories";
import {CrossbowConfiguration} from "../config";
import logger from "../logger";
import {Task} from "../task.resolve";
import {SubtaskNotFoundError, TaskErrorTypes} from "../task.errors";
import {Meow, CrossbowInput} from "../index";
import {SubtaskNotProvidedError} from "../task.errors";

const escape = (x) => x
    .replace(/\{/g, '\\\{')
    .replace(/}/g, '\\\}');

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
        logger.info('');
        logger.info('{gray:---------------------------' + lineLength);
        logger.info("{gray:+ Summary from the input: {gray.bold:%s}", cliInput);
        logger.info('{gray:---------------------------' + lineLength);
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
    sequence.forEach(function (item) {
        if (item.type === SequenceItemTypes.Task) {
            if (item.subTaskName) {
                return logger.info('{gray:%s}{ok: } %s (with config: {bold:%s}) {yellow:%sms}', indent.length ? indent + ' ': '', item.task.taskName, item.subTaskName, item.duration);
            } else {
                return logger.info('{gray:%s}{ok: } %s {yellow:%sms}', indent.length ? indent + ' ': '', item.task.taskName, item.duration);
            }
        }
        logger.info('{gray:%s}{white.bold:[%s]} {gray:%s}', indent.length ? indent + ' ': '', item.taskName, SequenceItemTypes[item.type]);
        logTaskCompletion(item.items, indent + '-');
    });
}

/**
 * Log the tree of tasks about to be run
 * @param sequence
 * @param indent
 */
function logTaskTree (sequence: SequenceItem[], indent: string) {
    sequence.forEach(function (item) {
        if (item.type === SequenceItemTypes.Task) {
            let name = item.task.taskName;
            if (item.fnName !== '') {
                name = `${name} fn: {${item.fnName}`;
            }
            if (item.subTaskName) {
                logger.info('{gray:%s}%s (with config: {bold:%s})', indent.length ? indent + ' ': '', name, item.subTaskName);
            } else {
                logger.info('{gray:%s}%s', indent.length ? indent + ' ': '', name);
            }
            return;
        }
        logger.info('{gray:%s}{white.bold:[%s]} {gray:%s}', indent.length ? indent + ' ': '', item.taskName, SequenceItemTypes[item.type]);
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
        logger.info('');
        logger.info('{gray:---------------------------' + lineLength);
        logger.info("{gray:+ Task tree for the input: {gray.bold:%s}", cliInput);
        logger.info('{gray:---------------------------' + lineLength);
        logTaskTree(sequence, '');
        logger.info('{gray:---------------------------' + lineLength);
    }
}

export function reportTaskErrors (tasks: Task[],
                                  cli: Meow,
                                  input: CrossbowInput,
                                  config: CrossbowConfiguration) {

    const modulePredicate = (x) => x.type === TaskErrorTypes.ModuleNotFound;

    logger.info('{gray.bold:------------------------------------------------}');
    logger.info('{err: } Sorry, there were errors resolving your tasks,');
    logger.info('{err: } So none of them were run.');
    logger.info('{gray.bold:------------------------------------------------}');

    cli.input.slice(1).forEach(function (n, i) {
    	logger.info("{gray:+ input: {gray.bold:'%s'}", n);
        logErrors([tasks[i]], '');
        logger.info('{gray.bold:-----------------------------------------------}');
    });

    function logErrors(tasks, indent) {
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
        } else {
            console.error('No reporter for error type', errorType);
        }
    });
}

const errorHandlers = {
    AdaptorNotFound: function (task, error, indent) {
        logger.info("{red:%s} {err: } {cyan:'%s'} Adaptor not supported", indent, task.adaptor);
    },
    ModuleNotFound: function (task: Task, error, indent) {
        logger.info("{red:%s} {err: } {cyan:'%s'} Task / Module not found", indent, task.rawInput);
    },
    SubtaskNotFound: function (task: Task, error: SubtaskNotFoundError, indent) {
        logger.info("{red:%s} {err: } {cyan:'%s'} Sub-Task {yellow.bold:'%s'} not found", indent, task.rawInput, error.name);
    },
    SubtaskNotProvided: function (task: Task, error: SubtaskNotProvidedError, indent) {
        logger.info("{red:%s} {err: } {cyan:'%s'} Sub-Task not provided", indent, task.rawInput, error.name);
    },
    SubtasksNotInConfig: function (task: Task, error: SubtaskNotProvidedError, indent) {
        logger.info("{red:%s} {err: } {cyan:'%s'} Configuration not provided for this task", indent, task.rawInput);
        logger.info("{red:%s} {err: } so you cannot use {cyan:<task>}:{yellow:*} syntax", indent);
    }
};

