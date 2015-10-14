var utils = require('./utils');
var basename = require('path').basename;
var objPath = require('object-path');
var Rx = require('rx');
var RxNode = require('rx-node');
var logger = require('./logger');
var gruntCompat = require('./grunt-compat');
var t = exports;
var compatAdaptors = {
    "grunt": {
        validate: () => {
            try {
                return require.resolve('grunt');
            } catch (e) {
                return false;
            }
        },
        create: gruntCompat
    }
};

var adaptorKeys = Object.keys(compatAdaptors);

t.flatTask     = flatTask;
t.resolveTasks = resolveTasks;
t.validateTask = validateTask;
/**
 * Create the flat task format
 * @param {String} task
 * @returns {{taskName: string, subTasks: Array, modules: Array, tasks: Array, compat: String|undefined, valid: Boolean}}
 */
function flatTask(task) {

    if (task.match(/^\$/)) {
        var compat = adaptorKeys.filter(x => {
            return task.match(new RegExp('\\$' + x));
        })[0];

        if (compat) {
            return {
                taskName: task.split(' ').slice(1),
                subTasks: [],
                modules: [],
                tasks: [],
                compat: compat,
                valid: true
            };
        } else {
            return {
                taskName: task,
                subTasks: [],
                modules: [],
                tasks: [],
                compat: undefined,
                valid: false
            };
        }
    }

    var splitTask = task.split(':');

    return {
        taskName: splitTask[0],
        subTasks: splitTask.slice(1),
        modules:  [],
        tasks:    [],
        compat:   undefined,
        valid:    true
    }
}

/**
 * @param {Array} initial
 * @param {Object} subject
 * @param {String} taskname
 * @returns {*}
 */
function resolveTasks(initial, subject, taskname) {

    if (Object.keys(subject).indexOf(taskname) > -1) {
        return subject[taskname].map(function (item) {
            var flat = flatTask(item);
            flat.tasks = resolveTasks(flat.tasks, subject, item);
            return flat;
        });
    }

    return initial;
}

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
        if (compatAdaptors[task.compat]) {
            return compatAdaptors[task.compat].validate.call();
        }
        return false;
    }
    return false;
}