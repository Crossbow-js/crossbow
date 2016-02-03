'use strict';

const utils   = require('./utils');
const objPath = require('object-path');
const compat  = require('./compat');

/**
 * The purpose of this function is to creating
 * a running sequence of tasks. This may include
 * 'flattening' out nested tasks and where there
 * may be multiple tasks items (ie: functions) per sequence item
 * @param {Array} tasks - objects in task format
 * @param {object} input
 * @param {Immutable.map} config
 * @returns {Array}
 */
module.exports.createSequence = function (tasks, input, config) {

    return flatten([], tasks);

    function flatten(initial, items) {

        return items.reduce((all, item) => {
            /**
             * If the current task has no related module,
             * but did have the adaptors flag, load the adaptors function for it
             */
            if (!item.modules.length && item.compat) {
                return all.concat(compatSeq(item, input, config));
            }

            /**
             * If the modules property is populated (ie: a JS file was found for it)
             * then load the module into memory and return
             */
            if (item.modules.length) {
                return all.concat(loadModules(input, item.modules, item));
            }

            /**
             * if the current item also has tasks (children tasks)
             * then repeat this process to retrieve them also
             */
            if (item.tasks.length) {
                return flatten(all, item.tasks);
            }

            return all;
        }, initial);
    }
};

/**
 * Accept first an array of tasks as an export,
 * then look if a single function was exported and
 * use that instead
 * @param {Object} item
 * @param {String} name
 * @param {Array} previous
 * @returns {Array}
 */
function getTaskFunctions(item, name, previous) {

    if (typeof item === 'function') {
        return previous.concat(item);
    }

    const moduleTasks = item.tasks;

    if (Array.isArray(moduleTasks)) {
        return previous.concat(moduleTasks);
    }

    return previous.concat(() => {
        console.error('Module %s did not have a tasks array or function export', name);
    });
}

/**
 * If the task resolves to a file on disk,
 * we pick out either the 'tasks' property
 * or the function export
 * @param {String} item
 * @returns {Object}
 */
function requireModule(item) {

    const tasks = getTaskFunctions(require(item), item, []);

    var completed = false;

    var taskItems = tasks.map(function (fn) {
        return {
            FUNCTION: fn,
            completed: false
        };
    });
    return {taskItems, completed};
}

/**
 * @param input
 * @param modules
 * @param item
 * @returns {*}
 */
function loadModules(input, modules, item) {

    /**
     * First access top-level configuration
     */
    let config       = objPath.get(input, 'config', {});
    let lookup       = item.taskName;

    /**
     * Now access a child property related to this task
     */
    let topLevelOpts = objPath.get(input, ['config', lookup], {});


    /**
     * If no subtasks exist, pass the config object relating to
     * this item
     */
    if (!item.subTasks.length) {
        return {
            seq: requireModule(modules[0]),
            opts: utils.transformStrings(topLevelOpts, config),
            task: item
        };
    }

    /**
     * If the subTasks[0] is a *
     * add a task for each key in the provided config
     * eg:
     *   tasks:
     *      css: ['sass:*', 'version-rev']
     *
     *   config:
     *      sass: {
     *          site: 'core.scss'
     *          dev:  'core.scss'
     *      }
     *
     * is exactly equivalent to running:
     *   -> ['sass:site', 'sass:dev']
     */
    if (item.subTasks[0] === '*') {
        let keys = Object.keys(topLevelOpts);
        if (keys.length) {
            return keys.reduce((all, subTaskName) => {
                return all.concat({
                    seq: requireModule(modules[0]),
                    opts: utils.transformStrings(topLevelOpts[subTaskName], config),
                    task: item,
                    subTaskName: subTaskName
                });
            }, []);
        }
    }

    /**
     * Final case is when there ARE subTasks,
     * Add a new task for each item.
     */
    return item.subTasks.map(function (subTaskName) {
        let subTaskOptions = objPath.get(topLevelOpts, [subTaskName], {});
        return {
            seq: requireModule(modules[0]),
            opts: utils.transformStrings(subTaskOptions, config),
            task: item,
            subTaskName: subTaskName
        };
    });
}

/**
 * Call the create method of the compatibility layer
 * to enable a fn that can be used in the pipeline
 * @param item
 * @param input
 * @param config
 * @returns {{fns: *[], opts: {}, task: *}}
 */
function compatSeq(item, input, config, parent) {

    var args = [
        input,
        config,
        item
    ];

    return {
        seq: {
            taskItems: [
                {
                    FUNCTION: compat.adaptors[item.compat].create.apply(null, args),
                    completed: false
                }
            ]
        },
        opts: {},
        task: item,
        parent
    };
}

/**
 * This is used by the reporter to unravell things such
 * as adaptors tasks so that we can display the correct headings
 * in the summary
 * @param sequence
 * @returns {*}
 */
module.exports.groupByParent = function (sequence) {

    return sequence.reduce(function (all, item) {

        var name = item.task.taskName;
        if (item.subTaskName) {
            name = [name, item.subTaskName].join(':');
        }
        if (item.task.compat) {
            name = '($' + item.task.compat + ') ' + item.task.rawInput;
        }
        return all.concat({
            name: name,
            seq: item.seq,
            task: item.task
        });
    }, []);
};

/**
 * Get a sequence time for a single item (that may
 * have many fns)
 * @param {Object} item
 * @returns {Number}
 */
function getSeqTime(item) {
    return item.seq.taskItems.reduce(function (all, item) {
        return all + item.duration;
    }, 0);
}

/**
 * Recursively compute all times + nested times
 * to get full execution time
 * @param {Array} arr
 * @returns {Number}
 */
function getSeqTimeMany(arr) {
    return arr.reduce(function (all, item) {
        return all + getSeqTime(item);
    }, 0);
}

module.exports.getSeqTime = getSeqTime;
module.exports.getSeqTimeMany = getSeqTimeMany;
