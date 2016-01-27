'use strict';

const utils       = require('./utils');
const merge       = require('lodash.merge');
const compat      = require('./compat');
const adaptorKeys = Object.keys(compat.compatAdaptors);

const defaultTask = {
    valid: false,
    compat: undefined,
    taskName: undefined,
    subTasks: [],
    modules: [],
    tasks: [],
    parent: ''
};

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
     * @param {string} task
     * @param {string} parent
     * @returns {{taskName: string, subTasks: Array, modules: Array, tasks: Array, compat: (String|undefined)}}
     */
    flatTask (task, parent) {

        /**
         * Never modify the current task if it begins
         * with a `$` - instead just return early with
         * a compat task
         *  eg: `$npm webpack`
         */
        if (task.match(/^\$/)) {
            return compatTask(task, getCompat(task), parent);
        }

        /**
         * Split the incoming taskname on colons
         *  eg: sass:site:dev
         *  ->  ['sass', 'site', 'dev']
         * @type {Array}
         */
        const splitTask = task.split(':');

        /**
         * Take the first (or the only) item as the base task name
         *  eg: uglify:*
         *  ->  'uglify'
         * @type {string}
         */
        const taskName  = splitTask[0];

        /**
         * Try to locate modules/files using the cwd + the current
         * task name. This happens as a first pass so that local files
         * can always override installed plugins.
         *  eg: `crossbow-sass` installed locally, but tasks/sass.js file exists
         *  ->  $ crossbow run sass
         *   =  tasks/sass.js will be run
         * @type {Array}
         */
        const locatedModules = utils.locateModule(this.config.get('cwd'), taskName);

        return getTask({
            taskName: taskName,
            subTasks: splitTask.slice(1),
            modules: locatedModules,
            tasks: this.resolveTasks([], this.input.tasks, taskName, parent),
            compat: undefined,
            valid: true,
            parent: parent
        });
    }
}

TaskResolver.prototype.resolveTasks = function resolveTasks(initial, subject, taskname, parent) {

    if (Object.keys(subject).indexOf(taskname) === -1) {
        return initial;
    }

    if (parent.indexOf(taskname) > -1) {
        throw new ReferenceError(`Infinite loop detected from task: \`${taskname}\` Parent Tasks: ${parent.join(', ')}`);
    }

    if (typeof subject[taskname] === 'string') {
        subject[taskname] = [subject[taskname]];
    }

    return subject[taskname].map(item => {
        var flat = this.flatTask(item, parent + ' ' + taskname);
        flat.tasks = this.resolveTasks(flat.tasks, subject, item, parent + ' ' + taskname);
        return flat;
    });
};

TaskResolver.prototype.gather = function (tasks) {

    const hash = tasks.join('-');

    if (this.cache[hash]) {
        return this.cache[hash];
    }

    const taskList = tasks.map(x => this.flatTask(x, []));

    const out = {
        valid: taskList.filter(x => validateTask(x, this.input, this.config)),
        invalid: taskList.filter(x => !validateTask(x, this.input, this.config))
    };

    this.cache[hash] = out;

    return out;
};

/**
 * A task is valid if every child eventually resolves to
 * having a module or has a compat helper
 * @param {Object} task
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

    var valid = task.modules.length > 0 || task.tasks.length > 0;
    if (valid && task.tasks.length) {
        return task.tasks.every(function (t) {
            return validateTask(t, input, config);
        });
    }
    if (valid && !task.tasks.length) {
        return true;
    }
    if (typeof task.compat === 'string') {
        if (compat.compatAdaptors[task.compat]) {
            return compat.compatAdaptors[task.compat].validate.call(null, input, config, task);
        }
        return false;
    }
    return false;
}

function getCompat(task) {
    return adaptorKeys.filter(x => {
        return task.match(new RegExp('\\$' + x));
    })[0];
}

function getTask(obj) {
    return merge({}, defaultTask, obj);
}

/**
 * Create the flat task format
 * @param {String} task
 * @returns {{taskName: string, subTasks: Array, modules: Array, tasks: Array, compat: String|undefined}}
 */
function compatTask(task, compat, parent) {

    if (compat) {
        return getTask({
            taskName: task.replace(/^\$(.+?) /, ''),
            rawInput: task.replace(/^\$(.+?) /, ''),
            compat: compat,
            valid: true,
            parent: parent
        });
    }

    return getTask({
        taskName: task
    });
}

module.exports.create = function (input, config) {
    return new TaskResolver(input, config);
};
