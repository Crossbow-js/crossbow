var prom    = require('prom-seq');
var resolve = require('path').resolve;
var exists  = require('fs').existsSync;
var objPath = require('object-path');
var logger  = require('./logger');
var copy    = require('./command.copy');

module.exports = function (cli, opts, trigger) {

    var tasks    = cli.input.slice(1);
    var taskList = [];
    var crossbow = opts.crossbow || {};

    if (!tasks.length === 0) {
        logger.error('Please provide a command for {magenta:Crossbow} to run');
        return;
    }

    if (!opts.ctx.trigger.type) {
        opts.ctx.trigger = trigger;
    }

    if (crossbow) {

        taskList = flattenTaskList([], tasks);

        function flattenTaskList(original, arr) {
            return arr.reduce(function (arr, task) {
                var maybe = getFromTasks(task);
                if (maybe) {
                    flattenTaskList(original, maybe);
                } else {
                    arr.push(task);
                }
                return arr;
            }, original);
        }
    }

    if (!taskList.length) {
        taskList = tasks.map(gatherTasks);
    } else {
        taskList = taskList.map(gatherTasks);
    }

    function getFromTasks (maybe) {
        return objPath.get(crossbow, ['tasks', maybe]);
    }

    function gatherTasks(name) {
        var taskList;
        var copyTask = name.match(/^copy:(.+)/);

        if (copyTask) {
            taskList = copy.makeCopyTask(copyTask[1], opts);
        } else {
            var possibles = [
                resolve(opts.cwd, 'tasks', name + '.js'),
                resolve(opts.cwd, 'tasks', name),
                resolve(opts.cwd, name + '.js'),
                resolve(opts.cwd, name),
                resolve(opts.cwd, 'node_modules', 'crossbow-' + name)
            ].some(function (filepath) {
                    if (exists(filepath)) {
                        logger.debug('{ok: } task found for {cyan:%s} in {yellow:%s', name, filepath);
                        taskList = require(filepath).tasks;
                        return true;
                    }
                });
        }

        if (!possibles && !taskList.length) {
            opts.cb(new Error('task `'+name+'` not found - please check your config'));
        }

        return taskList;
    }

    if (opts.handoff) {
        return prom.create(taskList)('', opts.ctx)
    }

    prom.create(taskList)('', opts.ctx)
        .then(function () {
            logger.info('{ok: } task%s {cyan:%s} completed', tasks.length > 1 ? 's' : '', tasks.join(' -> '));
            opts.cb(null);
        })
        .progress(function (report) {
            logger[report.level](report.msg);
        })
        .catch(function (err) {
            throw err;
        }).done();
};