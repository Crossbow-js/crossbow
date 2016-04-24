import {AdaptorNotFoundError} from "./task.errors";
const merge   = require('lodash.merge');
const assign  = require('object-assign');
const debug   = require('debug')('cb:task.resolve');

import {TaskErrorTypes, gatherTaskErrors} from "./task.errors";
import {locateModule} from "./task.utils";
import * as adaptors from "./adaptors";

import {preprocessTask, removeNewlines} from "./task.preprocess";
import {CrossbowInput} from "./index";
import {CommandTrigger} from "./command.run";
import {Task, TasknameWithOrigin, Tasks} from "./task.resolve.d";

export enum TaskTypes {
    Runnable = <any>"Runnable",
    Adaptor = <any>"Adaptor",
    Group = <any>"Group",
    NpmScript = <any>"NpmScript"
}

export enum TaskOriginTypes {
    CrossbowConfig = <any>"CrossbowConfig",
    NpmScripts = <any>"NpmScripts",
    FileSystem = <any>"FileSystem",
    Adaptor = <any>"Adaptor"
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

/**
 * Entry point for all tasks
 */
function createFlattenedTask (taskName:string, parents:string[], trigger:CommandTrigger): Task {

    /**
     * Remove any newlines on incoming task names
     * (eg: in yaml files where commands are split
     * into multiple lines, that sometimes leaves a trailing
     * \n char.
     */
    taskName = removeNewlines(taskName);

    /**
     * Never modify the current task if it begins
     * with a `@` - instead just return early with
     * a adaptors task
     *  eg: `@npm webpack`
     */
    if (taskName.match(/^@/)) {
        return createAdaptorTask(taskName, parents);
    }

    /**
     * Do basic processing on each task such as splitting out flags/sub-tasks
     * @type {OutgoingTask}
     */
    const incoming = preprocessTask(taskName, trigger.input);

    /**
     * Try to locate modules/files using the cwd + the current
     * task name. This happens as a first pass so that local files
     * can always override installed plugins.
     *  eg: `crossbow-sass` installed locally, but tasks/sass.js file exists
     *  ->  $ crossbow run sass
     *   =  tasks/sass.js will be run
     * @type {Array}
     */
    incoming.modules = locateModule(trigger.config.cwd, incoming.baseTaskName);

    /**
     * Resolve any child tasks if no modules were found, this is the core of how the recursive
     * alias's work
     */
    // todo unit test this logic - or even better make it obsolete
    if (!incoming.modules.length) {
        incoming.tasks = resolveChildTasks([], incoming.baseTaskName, parents, trigger);
    }

    const errors = gatherTaskErrors(
        incoming,
        trigger.input
    );

    const type = incoming.modules.length
        ? TaskTypes.Runnable
        : TaskTypes.Group;

    return createTask(assign({}, incoming, {
        parents,
        errors,
        type,
        valid: errors.length === 0
    }));
}

function resolveChildTasks (initialTasks: any[], taskName: string, parents: string[], trigger: CommandTrigger): Task[] {

    const subject = pullTaskFromInput(taskName, trigger.input);

    if (subject.items.length === 0) {
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
     * Now return an array of sub-tasks that have also been
     * resolved recursively
     */
    return subject.items.map(item => {
        const flat  = createFlattenedTask(item, parents.concat(taskName), trigger);
        flat.origin = subject.origin;

        /**
         * Never try to resolve children tasks if this is an adaptor
         */
        if (flat.type === TaskTypes.Adaptor) {
            return flat;
        }

        if (!flat.modules.length) {
            flat.tasks  = resolveChildTasks(flat.tasks, item, parents.concat(taskName), trigger);
        }
        return flat;
    });
}

function createAdaptorTask (taskName, parents) : Task {

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
        return taskName.match(new RegExp('^@' + x));
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
        runMode: 'series',
        query: {},
        flags: {},
        origin: TaskOriginTypes.Adaptor,
        type: TaskTypes.Adaptor
    };
}

/**
 * Attempt to match a task-name from within the various 'inputs'
 * given
 */
function pullTaskFromInput (taskName: string, input: CrossbowInput): TasknameWithOrigin {

    if (input.tasks[taskName] !== undefined) {
        return {items: [].concat(input.tasks[taskName]), origin: TaskOriginTypes.CrossbowConfig}
    }

    if (input.npmScripts[taskName] !== undefined) {
        return {items: [].concat(input.npmScripts[taskName]), origin: TaskOriginTypes.NpmScripts}
    }

    /**
     * Next, look at the top-level input,
     * is this taskname going to match, and if so, does it contain any flags?
     */
    const maybes = Object.keys(input.tasks).reduce(function (all, key) {
        const match = key.match(new RegExp(`^${taskName}@(.+)`));
        if (match) {
            return input.tasks[key];
        }
        return all;
    }, []);

    if (maybes.length) {
        return {items: maybes, origin: TaskOriginTypes.CrossbowConfig};
    }

    return {items: [], origin: TaskOriginTypes.CrossbowConfig};
}

/**
 * A task is valid if every child eventually resolves to
 * having a module or has a adaptors helper
 */
function validateTask (task:Task, trigger:CommandTrigger):boolean {
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

export function resolveTasks (taskNames:string[], trigger: CommandTrigger): Tasks {
    const taskList = taskNames
        /**
         * Now begin making the nested task tree
         */
        .map(taskName => {
            return createFlattenedTask(taskName, [], trigger)
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
