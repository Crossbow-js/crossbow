var prom = require('prom-seq');
var resolve = require('path').resolve;
var objPath = require('object-path');
var logger = require('./logger');
var copy = require('./command.copy');
var fs = require('fs');
var Rx = require('rx');
var exists = Rx.Observable.fromNodeCallback(fs.exists);
var getPresentableTaskList = require('./utils').getPresentableTaskList;
var utils = require('./utils');

module.exports = function (cli, input, trigger) {

    var tasks = cli.input.slice(1);
    var crossbow = input.crossbow || {};
    crossbow.tasks = crossbow.tasks || {};
    var config = trigger.config;
    var cb = config.get('cb');

    if (!tasks.length === 0) {
        logger.error('Please provide a command for {magenta:Crossbow} to run');
        return;
    }

    if (!input.ctx.trigger.type) {
        input.ctx.trigger = trigger;
    }

    var cliTasks = Rx.Observable.fromArray(tasks);

    var tasks = cliTasks.map(function (x) {
        return x.split(':');
    }).map(function (x) {
        return flatTask(x);
    });

    var alias = cliTasks.filter(function (x) {
        return Object.keys(crossbow.tasks).indexOf(x) > -1;
    }).map(function (x) {
        var task = flatTask([x]);
        task.tasks = crossbow.tasks[x].map(flatTask);
        return task;
    }).map(function (x) {
        return flatTask([x]);
    }).subscribe(function (x) {
        return console.log(x);
    });

    var validTasks = tasks.filter(function (x) {
        return x.modules.length;
    }).toArray();

    var invalidTasks = tasks.filter(function (x) {
        return x.modules.length === 0;
    }).toArray();

    Rx.Observable.zip(validTasks, invalidTasks, function (valid, invalid) {
        return { valid: valid, invalid: invalid };
    }).subscribe(function (x) {
        config.get('cb')(null, x);
    }, function (e) {
        throw e;
    }, function (s) {
        return console.log("\nall done");
    });

    /**
     * @param {Array} task
     * @returns {{taskName: *, subTasks: *, modules: Array.<T>}}
     */
    function flatTask(task) {
        if (!Array.isArray(task)) {
            task = [task];
        }
        return {
            taskName: task[0],
            subTasks: task.slice(1),
            modules: utils.locateModule(config.get('cwd'), task[0])
        };
    }

    //if (opts.handoff) {
    //    return prom.create(taskList)('', opts.ctx);
    //}
    //
    //prom.create(taskList)('', opts.ctx)
    //    .then(function () {
    //        logger.info('{ok: } task%s {cyan:%s} completed', tasks.length > 1 ? 's' : '', getPresentableTaskList(tasks).join(' -> '));
    //        opts.cb(null);
    //    })
    //    .progress(function (report) {
    //        if (Array.isArray(report.msg)) {
    //            logger[report.level].apply(logger, report.msg);
    //        } else {
    //            logger[report.level](report.msg);
    //        }
    //    })
    //    .catch(function (err) {
    //        throw err;
    //    }).done();
};