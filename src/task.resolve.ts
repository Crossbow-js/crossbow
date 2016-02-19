import {AdaptorNotFoundError} from "./task.errors";
const merge   = require('lodash.merge');

import {TaskErrorTypes, TaskError, gatherTaskErrors} from "./task.errors";
import {locateModule} from "./task.utils";
import * as adaptors from "./adaptors";

import {RunCommandTrigger} from "./command.run";
import preprocessTask from "./task.preprocess";

export interface Task {
    valid: boolean
    taskName: string
    subTasks: string[]
    modules: string[]
    tasks: Task[]
    rawInput: string
    parents: string[]
    errors: TaskError[]
    adaptor?: string
    command?: string
    runMode: string
    startTime?: number
    endTime?: number
    duration?: number
}

const defaultTask = <Task>{
    valid: false,
    rawInput: '',
    taskName: undefined,
    subTasks: [],
    modules: [],
    tasks: [],
    parents: [],
    errors: [],
    runMode: 'series'
};

/**
 * Factory for creating a new Task Item
 * @param {object} obj
 * @returns {object}
 */
function createTask(obj: any) : Task {
    return merge({}, defaultTask, obj);
}

function createAdaptorTask (taskName, parents) : Task {
    /**
     * Get a valid adaptors adaptor name
     * @type {string|undefined}
     */
    const validAdaptorName = Object.keys(adaptors).filter(x => {
        return taskName.match(new RegExp('^@' + x));
    })[0];

    /**
     * If it was not valid, return a simple
     * task that will be invalid
     */
    if (!validAdaptorName) {
        return createTask({
            taskName: taskName,
            errors: [<AdaptorNotFoundError>{
                type: TaskErrorTypes.AdaptorNotFound,
                taskName: taskName
            }]
        });
    }

    /**
     * Strip the first part of the task name.
     *  eg: `@npm eslint`
     *   ->  eslint
     * @type {string}
     */
    const commandInput = taskName.replace(/^@(.+?) /, '');

    return <Task>{
        valid: true,
        adaptor: validAdaptorName,
        taskName: taskName,
        subTasks: [],
        modules: [],
        tasks: [],
        rawInput: taskName,
        parents: parents,
        errors: [],
        command: commandInput,
        runMode: 'series'
    };
}

export interface Tasks {
    valid: Task[]
    invalid: Task[]
}

function createFlattenedTask (taskName:string, parents:string[], trigger:RunCommandTrigger): Task {

    /**
     * Never modify the current task if it begins
     * with a `@` - instead just return early with
     * a adaptors task
     *  eg: `@npm webpack`
     */
    if (taskName.match(/^@/)) {
        return createAdaptorTask(taskName, parents);
    }

    const incoming = preprocessTask(taskName);

    /**
     * Try to locate modules/files using the cwd + the current
     * task name. This happens as a first pass so that local files
     * can always override installed plugins.
     *  eg: `crossbow-sass` installed locally, but tasks/sass.js file exists
     *  ->  $ crossbow run sass
     *   =  tasks/sass.js will be run
     * @type {Array}
     */
    const locatedModules = locateModule(trigger.config.cwd, incoming.baseTaskName);

    /**
     * Next resolve any child tasks, this is the core of how the recursive
     * alias's work
     */
    const childTasks     = resolveChildTasks([], trigger.input.tasks, incoming.baseTaskName, parents, trigger);

    const errors         = gatherTaskErrors(
        locatedModules,
        childTasks,
        incoming.subTasks,
        incoming.baseTaskName,
        trigger.input
    );

    return createTask(Object.assign({}, incoming, {
        parents,
        errors,
        modules:  locatedModules,
        tasks:    childTasks,
        valid:    errors.length === 0
    }));
}

function resolveChildTasks (initialTasks: any[], currentTasksObject: any, taskName: string, parents: string[], trigger: RunCommandTrigger): Task[] {
    /**
     * If current task object we're looking at does not contain
     * the current taskName, just return the initialTasks array (could be empty)
     */
    if (Object.keys(currentTasksObject).indexOf(taskName) === -1) {
        return initialTasks;
    }

    /**
     * Ensure we're not looking at a previously resolved item to avoid
     * an infinite loop
     */
    if (parents.indexOf(taskName) > -1) {
        throw new ReferenceError(`Infinite loop detected from task: \`${taskName}\` Parent Tasks: ${parents.join(', ')}`);
    }

    /**
     * Allow tasks in either string or array format
     *  eg 1: lint: '@npm eslint'
     *  eg 2: lint: ['@npm eslint']
     * @type {Array}
     */
    const subject = [].concat(currentTasksObject[taskName]);

    /**
     * Now return an array of sub-tasks that have also been
     * resolved recursively
     */
    return subject.map(item => {
        const flat = createFlattenedTask(item, parents.concat(taskName), trigger);
        flat.tasks = resolveChildTasks(flat.tasks, currentTasksObject, item, parents.concat(taskName), trigger);
        return flat;
    });
}

/**
 * A task is valid if every child eventually resolves to
 * having a module or has a adaptors helper
 */
function validateTask (task:Task, trigger:RunCommandTrigger):boolean {
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
     * In the case where `task.modules` has a length (meaning a JS file was found)
     * and there are NO sub tasks to validate, this means the current
     * task is ALWAYS valid so we can return true;
     */
    if (task.modules.length && !task.tasks.length) {
        return true;
    }
}

export function resolveTasks (taskNames:string[], trigger:RunCommandTrigger): Tasks {
    const taskList = taskNames.map(taskName => createFlattenedTask(taskName, [], trigger));
    /**
     * Return both valid & invalid tasks. We want to let consumers
     * handle errors/successes
     * @type {{valid: Array, invalid: Array}}
     */
    const output = {
        valid: taskList.filter(x => validateTask(x, trigger)),
        invalid: taskList.filter(x => !validateTask(x, trigger))
    };

    return output;
}
