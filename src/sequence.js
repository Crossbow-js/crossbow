var utils = require('./utils');
var basename = require('path').basename;
var objPath = require('object-path');
var Rx = require('rx');
var RxNode = require('rx-node');
var logger = require('./logger');
var gruntCompat = require('./grunt-compat');
var t = require('./task-resolve');
var compat = require('./compat');

module.exports = function (tasks, input, config) {

    return flatten([], tasks, []);

    function flatten (initial, items, parents) {
        return items.reduce((all, item) => {
            if (!item.modules.length && item.compat) {
                return all.concat(compatSeq(item, input, config, parents))
            }
            if (item.modules.length) {
                return all.concat(loadModules(input, item.modules, item, parents));
            }
            if (item.tasks.length) {
                return flatten(all, item.tasks, parents.concat(item.taskName));
            }
            return all;
        }, initial);
    }
}

/**
 * If the task resolves to a file on disk,
 * we pick out the 'tasks' property
 * @param {String} item
 * @returns {Object}
 */
function requireModule(item) {
    var tasks = [].concat(require(item).tasks);
    var completed = false;
    var taskItems = tasks.map(function (fn) {
    	return {
            FUNCTION: fn,
            completed: false
        }
    })
    return {taskItems, completed};
}

/**
 * @param input
 * @param modules
 * @param item
 * @param parentTaskName
 * @returns {*}
 */
function loadModules (input, modules, item, parentTaskName) {

    let config = objPath.get(input, 'config', {});

    if (!item.subTasks.length) {
        let topLevelOpts = objPath.get(input, ['config', item.taskName], {});
        return {
            seq: requireModule(modules[0]),
            opts: utils.transformStrings(topLevelOpts, config),
            task: item,
            via: parentTaskName
        };
    }

    return item.subTasks.map(function (subTask) {
        let subTaskOptions = objPath.get(input, ['config', item.taskName, subTask], {});
        return {
            seq: requireModule(modules[0]),
            opts: utils.transformStrings(subTaskOptions, config),
            task: item,
            via: parentTaskName
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
function compatSeq (item, input, config, parentTaskName) {

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
        via: parentTaskName
    }
}