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

export interface ModuleNotFoundError     extends TaskError { type: TaskErrorTypes }
export interface SubtaskNotInConfigError extends TaskError { type: TaskErrorTypes, name: string }
export interface SubtaskNotProvidedError extends TaskError { type: TaskErrorTypes, name: string }
export interface SubtaskNotFoundError    extends TaskError { type: TaskErrorTypes, name: string }
export interface AdaptorNotFoundError    extends TaskError { type: TaskErrorTypes, taskName: string }
export interface FlagNotFoundError       extends TaskError { type: TaskErrorTypes, taskName: string }
export interface FlagNotProvidedError    extends TaskError { type: TaskErrorTypes, taskName: string }

export function gatherTaskErrors (locatedModules, childTasks, subTaskItems, baseTaskName, input): TaskError[] {
    /**
     * If a module was not located, and there are 0 child tasks,
     * this can be classified as a `module not found error`
     */
    const moduleError = (locatedModules.length === 0 && childTasks.length === 0)
        ? [<ModuleNotFoundError>{type: TaskErrorTypes.ModuleNotFound}]
        : [];

    /**
     * Now validate any subtasks given with colon syntax
     *  eg: sass:dev
     *   -> must have a configuration object under the key sass.dev
     *   -> VALID
     *      config:
     *        sass:
     *          dev: 'input.scss'
     */

    return subTaskItems.reduce((all, name) => {
        /**
         * if a star was given as a subTask,
         * then this item must have configuration
         * as we'll want to run once with each key
         */
        if (name === '*') {
            const configKeys = Object.keys(objPath.get(input, ['config'].concat(baseTaskName), {}));
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
        const match = objPath.get(input, ['config'].concat(baseTaskName, name));
        if (match === undefined) {
            return all.concat(<SubtaskNotFoundError>{
                type: TaskErrorTypes.SubtaskNotFound,
                name: name
            });
        }

        return all;
    }, moduleError);
}
