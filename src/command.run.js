var prom    = require('prom-seq');
var resolve = require('path').resolve;
var objPath = require('object-path');
var logger  = require('./logger');
var copy    = require('./command.copy');
var fs      = require('fs');
var Rx      = require('rx');
var exists  = Rx.Observable.fromNodeCallback(fs.exists);
var getPresentableTaskList = require('./utils').getPresentableTaskList;

module.exports = function (cli, input, trigger) {

    var tasks    = cli.input.slice(1);
    var crossbow = input.crossbow || {};
    var config   = trigger.config;
    var cb       = config.get('cb');

    if (!tasks.length === 0) {
        logger.error('Please provide a command for {magenta:Crossbow} to run');
        return;
    }

    if (!input.ctx.trigger.type) {
        input.ctx.trigger = trigger;
    }

    var str = Rx.Observable.fromArray(tasks);

    var tasks = str
        .map(x => x.split(':'))
        .map(x => {
            return {
                taskName: x[0],
                subTasks: x.slice(1),
                modules: locateModule(x[0])
            }
        });

    var validTasks = tasks
        .filter(x => x.modules.length)
        .toArray();

    var invalidTasks = tasks
        .filter(x => x.modules.length === 0)
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
            s => console.log("all done")
        );

        function locateModule (name) {
            return [
                resolve(input.cwd, 'tasks', name + '.js'),
                resolve(input.cwd, 'tasks', name),
                resolve(input.cwd, name + '.js'),
                resolve(input.cwd, name),
                resolve(input.cwd, 'node_modules', 'crossbow-' + name)
            ].filter(x => fs.existsSync(x))
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