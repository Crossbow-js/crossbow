'use strict';

var utils = require('./utils');
var objPath = require('object-path');
var compat = require('./compat');

module.exports = function (tasks, input, config) {

    return flatten([], tasks);

    function flatten(initial, items) {
        return items.reduce((all, item) => {
            if (!item.modules.length && item.compat) {
                return all.concat(compatSeq(item, input, config));
            }

            if (item.modules.length) {
                return all.concat(loadModules(input, item.modules, item));
            }
            if (item.tasks.length) {
                return flatten(all, item.tasks);
            }
            return all;
        }, initial);
    }
};

/**
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

function getSeqTime(item) {
    return item.seq.taskItems.reduce(function (all, item) {
        return all + item.duration;
    }, 0);
}

function getSeqTimeMany(arr) {
    return arr.reduce(function (all, item) {
        return all + getSeqTime(item);
    }, 0);
}

module.exports.getSeqTime = getSeqTime;
module.exports.getSeqTimeMany = getSeqTimeMany;

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

    let config = objPath.get(input, 'config', {});
    let lookup = item.taskName;


    if (item.alias) {
        lookup = item.alias;
    }

    if (!item.subTasks.length) {
        let topLevelOpts = objPath.get(input, ['config', lookup], {});

        return {
            seq: requireModule(modules[0]),
            opts: utils.transformStrings(topLevelOpts, config),
            task: item
        };
    }


    if (item.subTasks[0] === '*') {
        let subTaskOptions = objPath.get(input, ['config', lookup], {});
        let keys = Object.keys(subTaskOptions);
        if (keys.length) {
            return keys.reduce((all, subTask) => {
                return all.concat({
                    seq: requireModule(modules[0]),
                    opts: utils.transformStrings(subTaskOptions[subTask], config),
                    task: item,
                    subTaskName: subTask
                });
            }, []);
        }
    }

    return item.subTasks.map(function (subTask) {
        let subTaskOptions = objPath.get(input, ['config', lookup, subTask], {});
        return {
            seq: requireModule(modules[0]),
            opts: utils.transformStrings(subTaskOptions, config),
            task: item,
            subTaskName: subTask
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
                    FUNCTION: compat.compatAdaptors[item.compat].create.apply(null, args),
                    completed: false
                }
            ]
        },
        opts: {},
        task: item,
        parent
    };
}
