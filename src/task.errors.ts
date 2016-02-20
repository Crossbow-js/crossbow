import {OutgoingTask} from "./task.preprocess";
import {CrossbowInput} from "./index";
const objPath = require('object-path');

export enum TaskErrorTypes {
    ModuleNotFound,
    SubtasksNotInConfig,
    SubtaskNotProvided,
    SubtaskNotFound,
    AdaptorNotFound,
    FlagNotFound,
    FlagNotProvided
}

export interface TaskError {}

export interface ModuleNotFoundError     extends TaskError { type: TaskErrorTypes, taskName: string }
export interface SubtaskNotInConfigError extends TaskError { type: TaskErrorTypes, name: string }
export interface SubtaskNotProvidedError extends TaskError { type: TaskErrorTypes, name: string }
export interface SubtaskNotFoundError    extends TaskError { type: TaskErrorTypes, name: string }
export interface AdaptorNotFoundError    extends TaskError { type: TaskErrorTypes, taskName: string }
export interface FlagNotFoundError       extends TaskError { type: TaskErrorTypes, taskName: string }
export interface FlagNotProvidedError    extends TaskError { type: TaskErrorTypes, taskName: string }

export function gatherTaskErrors (outgoing: OutgoingTask, input:CrossbowInput): TaskError[] {
    return [
        getModuleErrors,
        getFlagErrors,
        getSubTaskErrors
    ].reduce((all, fn) => all.concat(fn(outgoing, input)), []);
}

function getModuleErrors (outgoing: OutgoingTask): TaskError[] {
    /**
     * If a module was not located, and there are 0 child tasks,
     * this can be classified as a `module not found error`
     */
    const errors = (outgoing.modules.length === 0 && outgoing.tasks.length === 0)
        ? [<ModuleNotFoundError>{type: TaskErrorTypes.ModuleNotFound, taskName: outgoing.taskName}]
        : [];
    return errors;
}

function getFlagErrors (outgoing: OutgoingTask): TaskError[] {
    return outgoing.flags.reduce((all, flag) => {
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
            return all.concat(<FlagNotProvidedError>{
                type: TaskErrorTypes.FlagNotProvided,
                taskName: outgoing.taskName
            });
        }
        return all;
    }, []);
}

function getSubTaskErrors (outgoing: OutgoingTask, input:CrossbowInput): TaskError[] {

    /**
     * Now validate any subtasks given with colon syntax
     *  eg: sass:dev
     *   -> must have a configuration object under the key sass.dev
     *   -> VALID
     *      config:
     *        sass:
     *          dev: 'input.scss'
     */
    return outgoing.subTasks.reduce((all, name) => {
        /**
         * if a star was given as a subTask,
         * then this item must have configuration
         * as we'll want to run once with each key
         */
        if (name === '*') {
            const configKeys = Object.keys(objPath.get(input, ['config'].concat(outgoing.baseTaskName), {}));
            if (!configKeys.length) {
                return all.concat(<SubtaskNotInConfigError>{
                    type: TaskErrorTypes.SubtasksNotInConfig,
                    name: name
                });
            }
            return all;
        }
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
        if (name === '') {
            return all.concat(<SubtaskNotProvidedError>{
                type: TaskErrorTypes.SubtaskNotProvided,
                name: name
            });
        }
        /**
         * Finally check if there's configuration that Matches this
         * key.
         */
        const match = objPath.get(input, ['config'].concat(outgoing.baseTaskName, name));
        if (match === undefined) {
            return all.concat(<SubtaskNotFoundError>{
                type: TaskErrorTypes.SubtaskNotFound,
                name: name
            });
        }
        return all;

    }, []);
}
