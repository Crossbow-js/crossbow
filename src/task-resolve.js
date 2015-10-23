var utils = require('./utils');
var basename = require('path').basename;
var objPath = require('object-path');
var Rx = require('rx');
var RxNode = require('rx-node');
var logger = require('./logger');
var gruntCompat = require('./grunt-compat');
var merge = require('lodash.merge');
var compat = require('./compat');
var t = exports;

var adaptorKeys = Object.keys(compat.compatAdaptors);

t.validateTask  = validateTask;

/**
 * A task is valid if every child eventually resolves to
 * having a module or has a compat helper
 * @param {Object} task
 * @returns {Boolean}
 */
function validateTask(task) {
    /**
     * Return early if a task has previously
     * been marked as invalid
     */
    if (task.valid === false) {
        return false;
    }
    var valid = task.modules.length > 0 || task.tasks.length > 0;
    if (valid && task.tasks.length) {
        return task.tasks.every(validateTask);
    }
    if (valid && !task.tasks.length) {
        return true;
    }
    if (typeof task.compat === 'string') {
        if (compat.compatAdaptors[task.compat]) {
            return compat.compatAdaptors[task.compat].validate.call();
        }
        return false;
    }
    return false;
}

function TaskResolver (input, config) {
    this.config = config;
    this.input = input;
    this.cache = {};
    return this;
}

function getCompat (task) {
    return adaptorKeys.filter(x => {
        return task.match(new RegExp('\\$' + x));
    })[0];
}

var defaultTask = {
    valid: false,
    compat: undefined,
    taskName: undefined,
    subTasks: [],
    modules: [],
    tasks: []
}

function getTask(obj) {
    return merge({}, defaultTask, obj);
}

/**
 * Create the flat task format
 * @param {String} task
 * @returns {{taskName: string, subTasks: Array, modules: Array, tasks: Array, compat: String|undefined}}
 */
function compatTask (task, compat) {

    if (compat) {
        return getTask({
            taskName: task.replace(/^\$(.+?) /, ''),
            rawInput: task.replace(/^\$(.+?) /, ''),
            compat: compat,
            valid: true
        });
    }

    return getTask({
        taskName: task
    });
}

/**
 * @param {Array} task
 * @returns {Object}
 */
TaskResolver.prototype.flatTask = function (task, parents) {

    var splitTask = task.split(':');

    if (task.match(/^\$/)) {
        return compatTask(task, getCompat(task));
    }

    return getTask({
        taskName: splitTask[0],
        subTasks: splitTask.slice(1),
        modules:  utils.locateModule(this.config.get('cwd'), splitTask[0]),
        tasks:    this.resolveTasks([], this.input.tasks, splitTask[0], parents),
        compat:   undefined,
        valid:    true,
        parents:  parents
    });
}

/**
 * @param {Array} initial
 * @param {Object} subject
 * @param {String} taskname
 * @returns {Array}
 */
TaskResolver.prototype.resolveTasks = function resolveTasks(initial, subject, taskname, parents) {

    if (Object.keys(subject).indexOf(taskname) > -1) {
        if (parents.indexOf(taskname) > -1) {
            throw new ReferenceError(`Infinite loop detected from task: \`${taskname}\`
Parent Tasks: ${parents.join(', ')}`);
        }
        return subject[taskname].map(item => {
            var flat = this.flatTask(item, parents.concat(taskname));
            flat.tasks = this.resolveTasks(flat.tasks, subject, item, parents.concat(taskname));
            return flat;
        });
    }

    return initial;
}

TaskResolver.prototype.gather = function (tasks) {

    var hash = tasks.join('-');
    if (this.cache[hash]) {
        return cache[hash];
    }

    var taskList = tasks
        .map(x => this.flatTask(x, []));

    var out = {
        valid:   taskList.filter(t.validateTask),
        invalid: taskList.filter(x => !t.validateTask(x))
    };

    this.cache[hash] = out;
    return out;
}

module.exports.create = function (input, config) {
	return new TaskResolver(input, config);
};