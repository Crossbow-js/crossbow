var prom = require('prom-seq');
var resolve = require('path').resolve;
var exists = require('fs').existsSync;
var objPath = require('object-path');
var logger = require('./logger');

module.exports = function (cli, opts) {

    var tasks = cli.input.slice(1);
    var taskList = [];
    var crossbow = opts.pkg.crossbow || {};

    if (!tasks.length === 0) {
        logger.error('Please provide a command for {magenta:Crossbow} to run');
        return;
    }

    if (crossbow) {
        var maybeTask = objPath.get(crossbow, ['tasks', tasks[0]], []);
        if (maybeTask.length) {
            taskList = maybeTask.map(gather);
        }
    }

    if (!taskList.length) {
        taskList = tasks.map(gather);
    }

    function gather(name) {
        var taskList;
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
        return taskList;
    }

    if (opts.handoff) {
        return prom.create(taskList)('', opts._ctx)
    }

    prom.create(taskList)('', opts._ctx)
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