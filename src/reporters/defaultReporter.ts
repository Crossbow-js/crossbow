import {SequenceItemTypes, SequenceItem} from "../task.sequence.factories";
import {CrossbowConfiguration} from "../config";
import logger from "../logger";
import {Task} from "../task.resolve";
import {SubtaskNotFoundError, TaskErrorTypes} from "../task.errors";
import {Meow, CrossbowInput} from "../index";

export function summary (
    sequence: SequenceItem[],
    cli: Meow,
    input: CrossbowInput,
    config: CrossbowConfiguration,
    runtime: number
) {

    if (config.summary !== 'short') {
        logTasks(sequence, '');
    }

    logger.info('Total: {yellow:(%sms)}', runtime);

    function logTasks (sequence, indent) {
        sequence.forEach(function (item) {
            if (item.type === SequenceItemTypes.Task) {
                return logger.info('{gray:%s}{cyan:%s} {yellow:(%sms)}', indent.length ? indent + ' ': '', item.task.taskName, item.duration);
            }
            logger.info('{gray:%s}{white.bold.underline:%s} ', indent.length ? indent + ' ': '', item.taskName);
            logTasks(item.items, indent + '-');
        });
    }
    function timeall (sequence, initial) {
        return sequence.reduce((a, item) => {
            if (item.type === SequenceItemTypes.Task) {
                return a + item.duration;
            }
            return a + timeall(item.items, a);
        }, initial);
    }
}

export function reportTaskList (sequence: SequenceItem[],
                                cli: Meow,
                                input: CrossbowInput,
                                config: CrossbowConfiguration) {

    logger.info('{yellow:->} {cyan:%s', cli.input.slice(1).join(', '));
}

export function reportTaskErrors (tasks: Task[],
                                  cli: Meow,
                                  input: CrossbowInput,
                                  config: CrossbowConfiguration) {

    logger.info('{gray.bold:-----------------------------------------------}');
    logger.info('{err: } Sorry, there were errors resolving your tasks');
    logger.info('{gray.bold:-----------------------------------------------}');

    cli.input.slice(1).forEach(function (n, i) {
    	logger.info("{gray:+ input: {gray.bold:'%s'}", n);
        logErrors([tasks[i]], '');
        logger.info('{gray.bold:-----------------------------------------------}');
    });

    function logErrors(tasks, indent) {
        tasks.forEach(function (task) {
            var logged = false;
            if (task.errors.length) {
                logged = true;
                task.errors.forEach(function (error) {
                    const errorType = TaskErrorTypes[error.type];
                    if (errorHandlers[errorType]) {
                        errorHandlers[errorType](task, error, indent + '-');
                    } else {
                        console.error('No reporter for error type', errorType);
                    }
                });
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

const errorHandlers = {
    AdaptorNotFound: function (task, error, indent) {
        logger.info("{red:%s} {err: } {cyan:'%s'} Adaptor not supported", indent, task.adaptor);
    },
    ModuleNotFound: function (task: Task, error, indent) {
        logger.info("{red:%s} {err: } {cyan:'%s'} could not be located as a Task or Module", indent, task.rawInput);
    },
    SubtaskNotFound: function (task: Task, error: SubtaskNotFoundError, indent) {
        logger.info("{red:%s} {err: } {cyan:'%s'} Sub-Task {yellow.bold:%s} not found", indent, task.rawInput, error.name);
    }
};

