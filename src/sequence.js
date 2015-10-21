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

    return flatten([], tasks);

    function flatten (initial, items) {
        return items.reduce((all, item) => {
            if (!item.modules.length && item.compat) {
                return all.concat(compatSeq(item, input, config))
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
}

/**
 * If the task resolves to a file on disk,
 * we pick out the 'tasks' property
 * @param {Array} all
 * @param {String} item
 * @returns {Array}
 */
function requireModule(all, item) {
    var tasks = [].concat(require(item).tasks);
    var completed = false;
    var taskMap = tasks.map(function (fn) {
    	return {
            FUNCTION: fn,
            completed: false
        }
    })
    return all.concat({taskMap, completed});
}

/**
 * @param input
 * @param modules
 * @param item
 * @returns {*}
 */
function loadModules (input, modules, item) {

    let config = objPath.get(input, 'config', {});

    if (!item.subTasks.length) {
        let topLevelOpts = objPath.get(input, ['config', item.taskName], {});
        return {
            fns: modules.reduce(requireModule, []),
            opts: utils.transformStrings(topLevelOpts, config),
            task: item
        };
    }

    return item.subTasks.map(function (subTask) {
        let subTaskOptions = objPath.get(input, ['config', item.taskName, subTask], {});
        return {
            fns: modules.reduce(requireModule, []),
            opts: utils.transformStrings(subTaskOptions, config),
            task: item
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
function compatSeq (item, input, config) {
    var args = [
        input,
        config,
        item
    ];

    return {
        fns: [compat.compatAdaptors[item.compat].create.apply(null, args)],
        opts: {},
        task: item
    }
}