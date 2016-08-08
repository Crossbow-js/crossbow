import {applyTransforms} from "./task.transforms";
const _ = require('../lodash.custom');
const debug = require('debug')('cb:task.resolve');

import {AdaptorNotFoundError, CircularReferenceError, TaskError} from "./task.errors";
import {TaskErrorTypes, gatherTaskErrors} from "./task.errors";
import {locateModule, removeTrailingNewlines, isPlainObject, ExternalTask} from "./task.utils";
import * as adaptors from "./adaptors";

import {preprocessTask} from "./task.preprocess";
import {CrossbowInput} from "./index";
import {CommandTrigger} from "./command.run";
import {Task, TasknameWithOrigin, Tasks} from "./task.resolve";

/**
 * Function.name is es6 & >
 */
export interface CBFunction extends Function {
    name: string
}
export type IncomingTaskItem = string|CBFunction;
export type TaskCollection = Array<IncomingTaskItem>;
export enum TaskTypes {
    ExternalTask = <any>"ExternalTask",
    Adaptor  = <any>"Adaptor",
    TaskGroup    = <any>"TaskGroup",
    InlineFunction = <any>"InlineFunction"
}

export enum TaskOriginTypes {
    CrossbowConfig = <any>"CrossbowConfig",
    NpmScripts = <any>"NpmScripts",
    FileSystem = <any>"FileSystem",
    Adaptor = <any>"Adaptor",
    InlineFunction = <any>"InlineFunction"
}

export enum TaskRunModes {
    series = <any>"series",
    parallel = <any>"parallel",
}

const defaultTask = <Task>{
    baseTaskName:    '',
    valid:           false,
    query:           {},
    flags:           {},
    subTasks:        [],
    inlineFunctions: [],
    externalTasks:   [],
    tasks:           [],
    parents:         [],
    errors:          [],
    cbflags:         [],
    description:     '',
    rawInput:        '',
    env:             {},
    taskName:        undefined,
    runMode:         TaskRunModes.series,
    skipped:         false
};

/**
 * Entry point for resolving the task tree from any given point
 */
function createFlattenedTask(taskItem: IncomingTaskItem, parents: string[], trigger: CommandTrigger): Task {

    /** DEBUG **/
    debug(`resolving ('${typeof taskItem}') ${taskItem}`);
    /** DEBUG-END **/

    /**
     * We first 'preprocess' the task in order to
     * handle different types of task input. Supported:
     *  - string
     *  - function
     *  - object literal
     * @type {Task}
     */
    let incoming = preprocessTask(taskItem, trigger, parents);

    /** DEBUG **/
    debug(`preprocessed '${taskItem}'`, incoming);
    /** DEBUG-END **/

    /**
     * We exit very quickly if the pre-process step has delivered
     * an 'adaptor' task - which means that's nothing left to determine.
     */
    if (incoming.type === TaskTypes.Adaptor) {
        return incoming;
    }

    /**
     * A 'toplevelValue' is when the current baseTaskName matches a key
     * in the given task definitions. This is classed an alias and we
     * may want to handle sub-task resolution differently depending
     * on when that value is.
     *
     * eg: If the user ran
     *   $ crossbow run js
     *
     * and there's task config like:
     *   js: ['task1', 'task2']
     *
     * -> Then the value is an array (2 items) that need resolving
     * themselves and setting as children.
     * @type {any}
     */
    let toplevelValue = getTopLevelValue(incoming, trigger);

    /**
     * There's a special case where the toplevel property of a task
     * maybe a group definition, like
     *
     * js:
     *  - tasks: ['one', 'two']
     *    description: 'Some description'
     *    runMode: 'parallel'
     *
     * In this case, we want to resolve 'one' and 'two' as children,
     * and not the object literal itself. A common use-case is when
     * you want to be able to provide a description for group-level tasks
     * but normally this is only possible on a per-task basis
     * @type {Task|Task}
     */
    incoming = (function () {
        if (isPlainObject(toplevelValue) && toplevelValue.tasks) {
            return createTask(_.merge(incoming, toplevelValue));
        }
        return incoming;
    })();
    
    /**
     * Determine which sub tasks need converting as children.
     * Based on what was explained above, we may want to pass the
     * toplevel Value, or may want to use the tasks value directly
     * @type {Array}
     */
    const toConvert = (function () {
        if (toplevelValue == undefined) return [];
        if (isPlainObject(toplevelValue) && toplevelValue.tasks) {
            return [].concat(toplevelValue.tasks);
        }
        if (typeof toplevelValue === 'function') {
            return [];
        }
        return [].concat(toplevelValue);
    })();
    
    /**
     * Set child tasks
     * @type {Task[]}
     */
    incoming.tasks = (function () {

        if (!toConvert.length) {
            return [];
        }

        return toConvert.map(x => {
            if (parents.indexOf(x) > -1) {
                // todo - create log output for circular reference errors
                return createCircularReferenceTask(incoming, parents);
            }
            return createFlattenedTask(x, parents.concat(incoming.baseTaskName), trigger);
        });
    })();

    /**
     * @type {CBFunction[]}
     */
    incoming.inlineFunctions = (function () {
        if (incoming.inlineFunctions.length) return incoming.inlineFunctions;
        if (incoming.tasks.length)           return [];
        const toplevel = getTopLevelValue(incoming, trigger);
        if (typeof toplevel === 'function') {
            return [toplevel];
        }
        return [];
    })();

    /**
     * @type {ExternalTask[]}
     */
    incoming.externalTasks = (function () {
        if (incoming.tasks.length)           return [];
        if (incoming.inlineFunctions.length) return [];
        return locateModule(trigger.config, incoming.baseTaskName);
    })();

    debug(`externalTasks: ${JSON.stringify(incoming.externalTasks[0])}`);

    /**
     * Set task types
     * @type {TaskTypes}
     */
    incoming.type = (function () {
        if (incoming.externalTasks.length) {
            return TaskTypes.ExternalTask;
        }
        if (incoming.inlineFunctions.length) {
            return TaskTypes.InlineFunction;
        }
        return TaskTypes.TaskGroup;
    })();

    debug(`type: ${incoming.type}`);

    /**
     * @type {boolean}
     */
    incoming.valid = (function () {
    	if (incoming.type === TaskTypes.TaskGroup)      return true;
    	if (incoming.type === TaskTypes.InlineFunction) return true;
    	if (incoming.type === TaskTypes.ExternalTask)   return true;
        return false;
    })();

    debug(`valid: ${incoming.valid}`);

    /**
     * Now apply any transformations
     * @type {Task}
     */
    incoming = applyTransforms(incoming);

    /**
     * Collect errors
     * @type {TaskError[]}
     */
    incoming.errors = gatherTaskErrors(
        incoming,
        trigger
    );

    debug(`errors: ${incoming.errors}`);

    /**
     * Add parents array (for detecting circular references);
     * @type {string[]}
     */
    incoming.parents = parents;

    return incoming
}

/**
 * Factory for creating a new Task Item
 * @param {object} obj
 * @returns {object}
 */
export function createTask(obj: any): Task {
    return _.merge({}, defaultTask, obj);
}

/**
 * When a circular reference is detected, exit with the appropriate error
 */
export function createCircularReferenceTask(incoming: Task, parents: string[]): Task {
    return _.merge({}, defaultTask, incoming, {
        errors: [<CircularReferenceError>{
            type: TaskErrorTypes.CircularReference,
            incoming: incoming,
            parents: parents
        }]
    });
}

/**
 * Match a task name with a top-level value from 'tasks'
 */
function getTopLevelValue(incoming: Task, trigger: CommandTrigger): any {
    const exactMatch = trigger.input.tasks[incoming.baseTaskName];

    if (exactMatch !== undefined) {
        return exactMatch;
    }

    const maybes = Object.keys(trigger.input.tasks).filter(taskName => taskName.match(new RegExp(`^${incoming.baseTaskName}($|@(.+?))`)) !== null);

    if (maybes.length) {
        return trigger.input.tasks[maybes[0]];
    }

    return undefined;
}

/**
 * Anything that begins @ is always an adaptor and will skip
 * file i/o etc.
 * @param taskName
 * @param parents
 * @returns {Task}
 */
export function createAdaptorTask(taskName, parents): Task {

    taskName = removeTrailingNewlines(taskName);

    /**
     * Strip the first part of the task name.
     *  eg: `@npm eslint`
     *   ->  eslint
     * @type {string}
     */
    const commandInput = taskName.replace(/^@(.+?) /, '');

    /**
     * Get a valid adaptors adaptor name
     * @type {string|undefined}
     */
    const validAdaptorName = Object.keys(adaptors).filter(x => {
        return taskName.match(new RegExp(`^@${x} `));
    })[0];

    /**
     * If it was not valid, return a simple
     * task that will be invalid
     */
    if (!validAdaptorName) {
        return createTask({
            rawInput: taskName,
            taskName: taskName,
            type: TaskTypes.Adaptor,
            origin: TaskOriginTypes.Adaptor,
            adaptor: taskName.split(' ')[0],
            errors: [<AdaptorNotFoundError>{
                type: TaskErrorTypes.AdaptorNotFound,
                taskName: taskName
            }]
        });
    }

    return createTask({
        baseTaskName: taskName,
        valid:    true,
        adaptor:  validAdaptorName,
        taskName: taskName,
        rawInput: taskName,
        parents:  parents,
        command:  commandInput,
        runMode:  TaskRunModes.series,
        origin:   TaskOriginTypes.Adaptor,
        type:     TaskTypes.Adaptor,
    });
}

/**
 * Look at a hash and determine if the incoming 'taskName'
 * could match a valid taskName.
 * eg:
 *  $ crossbow run shane
 *
 * -> matches:   'shane' & 'shane@p'
 */
export function maybeTaskNames(tasks:{}, taskName:string): string[] {

    return Object.keys(tasks).reduce(function (all, key) {

        const match = key.match(new RegExp(`^${taskName}@(.+)`));

        if (match) {
            return tasks[key];
        }
        return all;
    }, []);
}

/**
 * Attempt to match a task-name from within the various 'inputs'
 * given
 */
function pullTaskFromInput(taskName: string, input: CrossbowInput): TasknameWithOrigin {

    if (input.tasks[taskName] !== undefined) {
        return {items: [].concat(input.tasks[taskName]), origin: TaskOriginTypes.CrossbowConfig}
    }

    /**
     * Next, look at the top-level input,
     * is this taskname going to match, and if so, does it contain any flags?
     */
    const maybes = maybeTaskNames(input.tasks, taskName);

    if (maybes.length) {
        return {items: maybes, origin: TaskOriginTypes.CrossbowConfig};
    }

    return {items: [], origin: TaskOriginTypes.CrossbowConfig};
}

/**
 * A task is valid if every child eventually resolves to
 * having a module or has a adaptors helper
 */
function validateTask(task: Task, trigger: CommandTrigger): boolean {
    /**
     * Return early if a task has previously
     * been marked as invalid
     */
    if (task.valid === false) {
        return false;
    }

    /**
     * If the task has errors attached, it's always invalid
     */
    if (task.errors.length) {
        return false;
    }

    /**
     * If this task has subtasks in the `task.tasks` Array
     * return the result of validating each of those.
     */
    if (task.tasks.length) {
        return task.tasks.every(function (t) {
            return validateTask(t, trigger);
        });
    }

    /**
     * The final chance for a task to be deemed valid
     * is when `task.adaptors` is set to a string.
     *  eg: lint: '@npm eslint'
     *   -> true
     */
    if (typeof task.adaptor === 'string') {

        /**
         * task.adaptor is a string, but does it match any adaptors?
         * If it does, return the result of running the
         * validate method from the adaptor
         */
        if (adaptors[<any>task.adaptor]) {
            return adaptors[<any>task.adaptor].validate.apply(null, [task, trigger]);
        }
    }

    /**
     * If this task was set to InlineFunction, it's always valid
     * (as there's a function to call)
     */
    if (task.type === TaskTypes.InlineFunction) {
        return true;
    }

    /**
     * If the task has external modules associated
     * with it, it's always valid (as it has things to run)
     */
    if (task.type === TaskTypes.ExternalTask) {
        return true;
    }

    /**
     * In the case where `task.modules` has a length (meaning a JS file was found)
     * and there are NO sub tasks to validate, this means the current
     * task is ALWAYS valid so we can return true;
     */
    if (task.externalTasks.length && !task.tasks.length) {
        return true;
    }
}

export function resolveTasks(taskCollection: TaskCollection, trigger: CommandTrigger): Tasks {
    const taskList = taskCollection
    /**
     * Now begin making the nested task tree
     */
        .map(task => {
            return createFlattenedTask(task, [], trigger)
        });
    /**
     * Return both valid & invalid tasks. We want to let consumers
     * handle errors/successes
     * @type {{valid: Array, invalid: Array}}
     */
    const output = {
        valid: taskList.filter(x => validateTask(x, trigger)),
        invalid: taskList.filter(x => !validateTask(x, trigger)),
        all: taskList
    };

    return output;

}

export interface Task {
    adaptor?: string
    command?: string
    valid: boolean
    taskName: string
    baseTaskName: string
    subTasks: string[]
    externalTasks: ExternalTask[]
    tasks: Task[]
    rawInput: string
    parents: string[]
    errors: TaskError[]
    runMode: TaskRunModes
    startTime?: number
    endTime?: number
    duration?: number
    query: any
    flags: any
    cbflags: string[]
    origin: TaskOriginTypes
    type: TaskTypes
    inlineFunctions: Array<CBFunction>
    env: any
    description: string
    skipped: boolean
}

export interface TasknameWithOrigin {
    items: string[]
    origin: TaskOriginTypes
}

export interface Tasks {
    valid: Task[]
    invalid: Task[],
    all: Task[]
}
