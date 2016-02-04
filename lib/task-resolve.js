'use strict';

const utils       = require('./utils');
const merge       = require('lodash.merge');
const compat      = require('./compat');
const adaptorKeys = Object.keys(compat.adaptors);

/**
 * Defaults for a single task
 * @type {{valid: boolean, compat: undefined, taskName: undefined, subTasks: Array, modules: Array, tasks: Array, parent: string}}
 */
const defaultTask = {
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
function createTask(obj) {
    return merge({}, defaultTask, obj);
}

/**
 * @param {Object} input
 * @param {Immutable.Map} config
 * @returns {TaskResolver}
 * @constructor
 */
class TaskResolver  {
    constructor (input, config) {
        this.config = config;
        this.input = input;
        this.cache = {};
        return this;
    }

    /**
     * Build a tree of tasks + subTask children
     * @param {string} taskName
     * @param {Array} parent
     * @returns {{taskName: string, subTasks: Array, modules: Array, tasks: Array, adaptors: (String|undefined)}}
     */
    flatTask (taskName, parent) {

        /**
         * Never modify the current task if it begins
         * with a `$` - instead just return early with
         * a adaptors task
         *  eg: `$npm webpack`
         */
        if (taskName.match(/^@/)) {
            return adaptorTask(taskName, parent);
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
        const locatedModules = utils.locateModule(this.config.get('cwd'), baseTaskName);
        const childTasks     = this.resolveChildTasks([], this.input.tasks, baseTaskName, parent);
        const subTaskItems   = splitTask.slice(1);

        const errors         = require('./task-errors')(
            locatedModules,
            childTasks,
            subTaskItems,
            baseTaskName,
            this.input
        );

        return createTask({
            taskName: baseTaskName,
            subTasks: subTaskItems,
            modules:  locatedModules,
            tasks:    childTasks,
            valid:    true,
            parent:   parent,
            errors:   errors
        });
    }

    /**
     * @param {Array} initialTasks
     * @param {Object} currentTasksObject
     * @param {String} taskName
     * @param {String} parent
     * @returns {*}
     */
    resolveChildTasks (initialTasks, currentTasksObject, taskName, parent) {

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
            throw new ReferenceError(`Infinite loop detected from task: \`${taskName}\` Parent Tasks: ${parent.join(', ')}`);
        }

        /**
         * Allow tasks in either string or array format
         *  eg 1: lint: '$npm eslint'
         *  eg 2: lint: ['$npm eslint']
         * @type {Array}
         */
        const subject = [].concat(currentTasksObject[taskName]);

        /**
         * Now return an array of subtasks that have also been
         * resolved recursively
         */
        return subject.map(item => {
            const flat = this.flatTask(item, parent + ' ' + taskName);
            flat.tasks = this.resolveChildTasks(flat.tasks, currentTasksObject, item, parent + ' ' + taskName);
            return flat;
        });
    }

    /**
     * @param tasks
     * @returns {*}
     */
    gather (tasks) {

        /**
         * Create a string to be used as the cache key for this set
         * of tasks.
         */
        const hash = tasks.join('-');

        /**
         * If we've already resolved this set of tasks
         * then return from the cache
         */
        if (this.cache[hash]) {
            return this.cache[hash];
        }

        /**
         * Create a taskList by flattening each task
         * recursively
         */
        const taskList = tasks.map(x => this.flatTask(x, []));

        /**
         * Return both valid & invalid tasks. We want to let consumers
         * handle errors/successes
         * @type {{valid: Array, invalid: Array}}
         */
        const out = {
            valid: taskList.filter(x => validateTask(x, this.input, this.config)),
            invalid: taskList.filter(x => !validateTask(x, this.input, this.config))
        };

        /**
         * Save this result in the cache
         * @type {{valid: Array, invalid: Array}}
         */
        this.cache[hash] = out;

        return out;
    }
}

/**
 * A task is valid if every child eventually resolves to
 * having a module or has a adaptors helper
 * @param {Object} task
 * @param {Object} input
 * @param {Immutable.Map} config
 * @returns {Boolean}
 */
function validateTask(task, input, config) {

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
            return validateTask(t, input, config);
        });
    }

    /**
     * In the case where `task.modules` has a length (meaning a JS file was found)
     * and there are NO sub tasks to validate, this means the current
     * task is ALWAYS valid so we can return true;
     */
    if (task.modules.length && !task.tasks.length) {
        return true;
    }

    /**
     * The final chance for a task to be deemed valid
     * is when `task.adaptors` is set to a string.
     *  eg: lint: '$npm eslint'
     *   -> true
     */
    if (typeof task.compat === 'string') {

        /**
         * task.adaptors is a string, but does it match any adaptors
         * adaptors? If it does, return the result of running the
         * validate method from the adaptor
         */
        if (compat.adaptors[task.compat]) {
            return compat.adaptors[task.compat].validate.call(null, input, config, task);
        }
    }

    /**
     * At this point the task cannot be valid
     * as there would be nothing to action
     */
    return false;
}

/**
 * Check if a given adaptors task has an adaptor
 * loaded for it.
 *  eg: lint: '$shell eslint'
 * @param {Array} adaptorKeys
 * @param {string} taskName
 * @returns {string|undefined}
 */
function getAdaptor(adaptorKeys, taskName) {
    return adaptorKeys.filter(x => {
        return taskName.match(new RegExp('^@' + x));
    })[0];
}

/**
 * Create the flat task format
 * @param {String} taskName
 * @param {String} adaptors
 * @param {Array} parent
 * @returns {{taskName: string, subTasks: Array, modules: Array, tasks: Array, adaptors: String|undefined}}
 */
function adaptorTask(taskName, parent) {

    /**
     * Get a valid adaptors adaptor name
     * @type {string|undefined}
     */
    const validAdaptorName = getAdaptor(adaptorKeys, taskName);

    /**
     * If it was not valid, return a simple
     * task that will be invalid
     */
    if (!validAdaptorName) {
        return createTask({
            taskName: taskName,
            errors: [{type: 'COMPAT_NOT_FOUND'}]
        });
    }

    /**
     * Strip the first part of the task name.
     *  eg: `$npm eslint`
     *   ->  eslint
     * @type {string}
     */
    const rawInput = taskName.replace(/^@(.+?) /, '');

    /**
     * Return a 'adaptors' task marked as valid
     */
    return createTask({
        taskName: rawInput,
        rawInput: rawInput,
        compat: validAdaptorName,
        valid: true,
        parent: parent
    });
}

/**
 * Expose factory
 * @param {Object} input
 * @param {Immutable.Map} config
 * @returns {TaskResolver}
 */
module.exports.create = function (input, config) {
    return new TaskResolver(input, config);
};
