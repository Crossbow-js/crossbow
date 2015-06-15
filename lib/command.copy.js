var prom = require('prom-seq');
var resolve = require('path').resolve;
var exists = require('fs').existsSync;
var objPath = require('object-path');
var logger = require('./logger');
var logger = require('./logger');

module.exports = function (cli, opts) {

    var tasks = cli.input.slice(1);
    var taskList = [];
    var crossbow = opts.pkg.crossbow || {};
    var copy = crossbow.copy;

    /**
     * multi/single task given on CLI
     */
    if (tasks.length) {
        taskList = tasks
            .filter(function (key) {
                return crossbow.copy[key];
            })
            .map(function (key) {
                return makeCopyTask(key, crossbow.copy[key]);
            });

    } else {
        taskList = Object.keys(copy).map(function (key) {
            var item = copy[key];
            return makeCopyTask(key, item);
        });
    }

    if (!taskList.length) {
        logger.error('No {cyan:copy} targets were found.');
        return;
    }



    function makeCopyTask(key, item) {
        return {
            name: key,
            tasks: gather(item, opts)
        };
    }

    function gather (item, opts) {
        var tasks = [];
        if (Array.isArray(item)) {
            tasks = item.map(split);
        }
        return tasks;
    }

    function split (item) {
        var segs = item.split(':');
        return {
            src: resolve(opts.cwd, segs[0]),
            dest: resolve(opts.cwd, segs[1])
        }
    }
};