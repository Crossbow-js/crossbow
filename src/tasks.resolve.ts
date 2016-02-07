const merge   = require('lodash.merge');

import {TaskError, gatherTaskErrors} from "./task.errors";
import {locateModule} from "./task.utils";
import adaptors from "./adaptor.defaults";

import {RunCommandTrigger} from "./command.run";

export interface Task {
    valid: boolean,
    compat: string|void,
    taskName: string|void,
    subTasks: string[],
    modules: string[],
    tasks: Task[],
    parent: string,
    errors: TaskError[]
}

const defaultTask = <Task>{
    valid: false,
    compat: undefined,
    taskName: undefined,
    subTasks: [],
    modules: [],
    tasks: [],
    parent: '',
    errors: []
};

/**
 * Factory for creating a new Task Item
 * @param {object} obj
 * @returns {object}
 */
function createTask(obj: any) : Task {
    return merge({}, defaultTask, obj);
}

function createAdaptorTask (taskName, parent) {
    /**
     * Get a valid adaptors adaptor name
     * @type {string|undefined}
     */
    const validAdaptorName = adaptorKeys.filter(x => {
        return taskName.match(new RegExp('^@' + x));
    })[0];
}

export interface Tasks {
    valid: Task[]
    invalid: Task[]
}

export interface TaskRunner {

};

function createFlattenedTask (taskName:string, parent:string, trigger:RunCommandTrigger): Task {

    /**
     * Never modify the current task if it begins
     * with a `$` - instead just return early with
     * a adaptors task
     *  eg: `$npm webpack`
     */
    if (taskName.match(/^@/)) {
        return createAdaptorTask(taskName, parent);
    }

    /**
     * Split the incoming taskname on colons
     *  eg: sass:site:dev
     *  ->  ['sass', 'site', 'dev']
     * @type {Array}
     */
    const splitTask = taskName.split(':');

    /**
     * Take the first (or the only) item as the base task name
     *  eg: uglify:*
     *  ->  'uglify'
     * @type {string}
     */
    const baseTaskName  = splitTask[0];

    /**
     * Try to locate modules/files using the cwd + the current
     * task name. This happens as a first pass so that local files
     * can always override installed plugins.
     *  eg: `crossbow-sass` installed locally, but tasks/sass.js file exists
     *  ->  $ crossbow run sass
     *   =  tasks/sass.js will be run
     * @type {Array}
     */
    const locatedModules = locateModule(trigger.config.cwd, baseTaskName);

    /**
     * Next resolve any child tasks, this is the core of how the recursive
     * alias's work
     */
    const childTasks     = resolveChildTasks([], trigger.input.tasks, baseTaskName, parent, trigger);
    const subTaskItems   = splitTask.slice(1);

    const errors         = gatherTaskErrors(
        locatedModules,
        childTasks,
        subTaskItems,
        baseTaskName,
        trigger.input
    );

    return createTask({
        taskName: baseTaskName,
        subTasks: subTaskItems,
        modules: locatedModules,
        tasks: childTasks,
        valid: errors.length === 0,
        parent: parent,
        errors: errors
    });
}

function resolveChildTasks (initialTasks: any[], currentTasksObject: any, taskName: string, parent: string, trigger: RunCommandTrigger): Task[] {
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
    if (parent.indexOf(taskName) > -1) {
        throw new ReferenceError(`Infinite loop detected from task: \`${taskName}\` Parent Tasks: ${parent}`);
    }

    /**
     * Allow tasks in either string or array format
     *  eg 1: lint: '$npm eslint'
     *  eg 2: lint: ['$npm eslint']
     * @type {Array}
     */
    const subject = [].concat(currentTasksObject[taskName]);

    /**
     * Now return an array of sub-tasks that have also been
     * resolved recursively
     */
    return subject.map(item => {
        const flat = createFlattenedTask(item, parent + ' ' + taskName, trigger);
        flat.tasks = resolveChildTasks(flat.tasks, currentTasksObject, item, parent + ' ' + taskName, trigger);
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

    // TODO ADD ADAPTORS for task resolution/validation

    /**
     * In the case where `task.modules` has a length (meaning a JS file was found)
     * and there are NO sub tasks to validate, this means the current
     * task is ALWAYS valid so we can return true;
     */
    if (task.modules.length && !task.tasks.length) {
        return true;
    }
}

export function gatherTasks (taskNames:string[], trigger:RunCommandTrigger): Tasks {
    const taskList = taskNames.map(taskName => createFlattenedTask(taskName, '', trigger));
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

export function createTaskRunner (taskNames:string[], trigger:RunCommandTrigger): TaskRunner {
    const tasks = gatherTasks(taskNames, trigger);
    return tasks;
}
