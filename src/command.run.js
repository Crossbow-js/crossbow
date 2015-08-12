var prom    = require('prom-seq');
var resolve = require('path').resolve;
var objPath = require('object-path');
var logger  = require('./logger');
var copy    = require('./command.copy');
var fs      = require('fs');
var Rx      = require('rx');
var exists  = Rx.Observable.fromNodeCallback(fs.exists);
var getPresentableTaskList = require('./utils').getPresentableTaskList;
var utils = require('./utils');

module.exports = function (cli, input, trigger) {

    var tasks      = cli.input.slice(1);
    var crossbow   = input.crossbow || {};
    crossbow.tasks = crossbow.tasks || {};
    var config     = trigger.config;
    var cb         = config.get('cb');

    if (!tasks.length === 0) {
        logger.error('Please provide a command for {magenta:Crossbow} to run');
        return;
    }

    if (!input.ctx.trigger.type) {
        input.ctx.trigger = trigger;
    }

    var cliTasks = Rx.Observable.fromArray(tasks);

    var tasks = cliTasks
        .map(x => x.split(':'))
        .map(x => flatTask(x))

    var validTasks = tasks
        .filter(x => validateTask(x))
        .toArray();

    var invalidTasks = tasks
        .filter(x => !validateTask(x))
        .toArray();

    Rx.Observable
        .zip(validTasks, invalidTasks, function (valid, invalid) {
            return {valid, invalid};
        })
        .subscribe(
            x => {
                config.get('cb')(null, x)
            },
            e => {
                throw e;
            },
            s => console.log("\nall done")
        );

    /**
     * Create the flat task format
     * @param {Array} task
     * @returns {{taskName: string, subTasks: Array, modules: Array, tasks: Array}}
     */
    function flatTask (task) {
        if (!Array.isArray(task)) {
            task = [task];
        }
        return {
            taskName: task[0],
            subTasks: task.slice(1),
            modules: utils.locateModule(config.get('cwd'), task[0]),
            tasks: resolveTasks([], task[0])
        }
    }

    /**
     *
     * @param initial
     * @param taskname
     * @returns {*}
     */
    function resolveTasks (initial, taskname) {

        var keys = Object.keys(crossbow.tasks);

        if (keys.indexOf(taskname) > -1) {
            return crossbow.tasks[taskname].map(function (item) {
                var flat   = flatTask(item);
                flat.tasks = resolveTasks(flat.tasks, item);
                return flat;
            });
        }

        return initial;
    }

    /**
     * A task is valid if every child eventually resolves to
     * having a module
     * @param {Object} task
     * @returns {*}
     */
    function validateTask(task) {
        var valid = task.modules.length > 0 || task.tasks.length > 0;
        if (valid && task.tasks.length) {
            return task.tasks.every(validateTask);
        }
        if (valid && !task.tasks.length) {
            return true;
        }
        return false;
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