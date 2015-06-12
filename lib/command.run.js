var prom    = require('prom-seq');
var resolve = require('path').resolve;
var objPath = require('object-path');
var logger  = require('./logger');

module.exports = function (cli, opts) {

    var task = cli.input[1];
    var taskList;
    var crossbow = opts.pkg.crossbow || {};

    if (!task) {
        logger.error('Please provide a command for {magenta:Crossbow} to run');
        return;
    }

    if (crossbow) {
        var maybeTask = objPath.get(crossbow, ['tasks', task]);
        if (maybeTask) {
            taskList = maybeTask.run.map(gather);
        }
    }

    if (!taskList) {
        taskList = gather(task);
    }

    function gather (name) {
        return require(resolve(opts.cwd, 'node_modules', 'crossbow-' + name)).tasks;
    }

    if (opts.handoff) {
        return prom.create(taskList)('', opts._ctx)
    }

    prom.create(taskList)('', opts._ctx)
        .then(function () {
            logger.info('{yellow:%s} complete', task);
            opts.cb(null);
        })
        .progress(function (report) {
            logger[report.level](report.msg);
        })
        .catch(function (err) {
            throw err;
        }).done();
};