import {Task} from "./task.resolve";
import {TaskTypes} from "./task.resolve";
import {isSupportedFileType} from "./task.utils";
import {CommandTrigger} from "./command.run";
import {ExternalFile} from "./file.utils";
const _ = require('../lodash.custom');

export enum TaskErrorTypes {
    TaskNotFound = <any>"TaskNotFound",
    SubtasksNotInConfig = <any>"SubtasksNotInConfig",
    SubtaskNotProvided = <any>"SubtaskNotProvided",
    SubtaskNotFound = <any>"SubtaskNotFound",
    SubtaskWildcardNotAvailable = <any>"SubtaskWildcardNotAvailable",
    AdaptorNotFound = <any>"AdaptorNotFound",
    FlagNotFound = <any>"FlagNotFound",
    CBFlagNotProvided = <any>"CBFlagNotProvided",
    InvalidTaskInput = <any>"InvalidTaskInput",
    CircularReference = <any>"CircularReference",
    FileTypeNotSupported = <any>"FileTypeNotSupported"
}

export function gatherTaskErrors(task: Task, trigger: CommandTrigger): TaskError[] {
    return [
        getModuleErrors,
        getFileTypeErrors,
        getCBFlagErrors,
        getSubTaskErrors
    ].reduce((all, fn) => all.concat(fn(task, trigger)), []);
}

function getModuleErrors(task: Task, trigger: CommandTrigger): TaskError[] {

    if (task.type === TaskTypes.ExternalTask)   return [];
    if (task.type === TaskTypes.InlineFunction) return [];

    /**
     * If a module was not located, and there are 0 child tasks,
     * this can be classified as a `module not found error`
     */
    if (task.externalTasks.length === 0 && task.tasks.length === 0) {
        return [<TaskNotFoundError>{
            type: TaskErrorTypes.TaskNotFound,
            taskName: task.taskName,
            cwd: trigger.config.cwd
        }]
    }

    return [];
}

function getFileTypeErrors(task: Task, trigger: CommandTrigger): TaskError[] {

    /**
     * If it's not an external task, this can never be an error
     */
    if (task.type !== TaskTypes.ExternalTask) return [];

    const supported = isSupportedFileType(task.externalTasks[0].parsed.ext);

    if (supported) return [];

    return [<FileTypeNotSupportedError>{type: TaskErrorTypes.FileTypeNotSupported, taskName: task.taskName, externalFile: task.externalTasks[0]}];
}

function getCBFlagErrors(task: Task, trigger: CommandTrigger): TaskError[] {
    return task.cbflags.reduce((all, flag) => {
        /**
         * if `flag` is an empty string, the user provided an @ after a task
         * name, but without the right-hand part.
         * eg:
         *   $ crossbow run build-css@
         *
         * when it should of been
         *   $ crossbow run build-css@p
         *
         */
        if (flag === '') {
            return all.concat(<CBFlagNotProvidedError>{
                type: TaskErrorTypes.CBFlagNotProvided,
                taskName: task.taskName
            });
        }

        return all;
    }, []);
}

function getSubTaskErrors(task: Task, trigger: CommandTrigger): TaskError[] {
    /**
     * Now validate any sub tasks given with colon syntax
     *  eg: sass:dev
     *   -> must have a configuration object under the key sass.dev
     *   -> VALID
     *      config:
     *        sass:
     *          dev: 'input.scss'
     */
    return task.subTasks.reduce((all, subTaskName) => {

        const configKeys = (function () {
            const taskOptions = Object.keys(_.get(task, "options", {}));
            if (taskOptions.length) {
                return taskOptions;
            }
            return Object.keys(_.get(trigger.input, ['options'].concat(task.baseTaskName), {}));
        })();

        /**
         * if `name` is an empty string, the user provided a colon-separated task
         * name without the right-hand part.
         * eg:
         *   $ crossbow run sass:
         *
         * when it should of been
         *   $ crossbow run sass:site:dev
         *
         */
        if (subTaskName === '') {
            return all.concat(<SubtaskNotProvidedError>{
                type: TaskErrorTypes.SubtaskNotProvided,
                name: subTaskName
            });
        }

        /**
         * if a star was given as a subTask,
         * then this item must have configuration
         * as we'll want to run once with each key
         */
        if (subTaskName === '*') {
            return all.concat(handleWildcardSubtask(configKeys, subTaskName));
        }

        /**
         * Now check if this is an attempt at loading a grouped task
         */
        if (subTaskName.length) {
            const matching = task.tasks.filter(x => x.taskName === subTaskName);
            if (matching.length) return all;
        }

        if (!configKeys.length) {
            return all.concat(<SubtasksNotInConfigError>{
                type: TaskErrorTypes.SubtasksNotInConfig,
                name: subTaskName
            });
        }

        /**
         * Finally check if there's configuration that Matches this
         * key.
         */
        const match = _.get(trigger.input, ['options'].concat(task.baseTaskName, subTaskName));
        const match2 = _.get(task, ['options'].concat(subTaskName));
        if (match === undefined && match2 === undefined) {
            return all.concat(<SubtaskNotFoundError>{
                type: TaskErrorTypes.SubtaskNotFound,
                name: subTaskName
            });
        }

        return all;

    }, []);
}

function handleWildcardSubtask(configKeys: string[], name: string): SubtaskWildcardNotAvailableError[] {

    if (configKeys.length) {
        return [];
    }

    return [{
        type: TaskErrorTypes.SubtaskWildcardNotAvailable,
        name: name
    }];
}

export interface TaskError {
    type: TaskErrorTypes
}
export interface TaskNotFoundError extends TaskError {
    taskName: string
    cwd: string
}
export interface SubtasksNotInConfigError extends TaskError {
    name: string
}
export interface SubtaskNotProvidedError extends TaskError {
    name: string
}
export interface SubtaskWildcardNotAvailableError extends TaskError {
    name: string
}
export interface SubtaskNotFoundError extends TaskError {
    name: string
}
export interface AdaptorNotFoundError extends TaskError {
    taskName: string
}
export interface InvalidTaskInputError extends TaskError {
    input: any
}

export interface CBFlagNotFoundError extends TaskError {
    taskName: string
}

export interface CBFlagNotProvidedError extends TaskError {
    taskName: string
}

export interface CircularReferenceError extends TaskError {
    incoming: Task
    parents: string[]
}

export interface FileTypeNotSupportedError extends TaskError {
    taskName: string,
    externalFile: ExternalFile
}
