var prom = require('prom-seq');
var resolve = require('path').resolve;
var objPath = require('object-path');
var logger = require('./logger');
var copy = require('./command.copy');
var fs = require('fs');
var Rx = require('rx');
var exists = Rx.Observable.fromNodeCallback(fs.exists);
var utils = require('./utils');

module.exports = function (cli, input, trigger) {

    var cliInput = cli.input.slice(1);
    var crossbow = input.crossbow || {};
    crossbow.tasks = crossbow.tasks || {};
    var config = trigger.config;
    var cb = config.get('cb');

    if (!cliInput.length) {
        logger.error('Please provide a command for {magenta:Crossbow} to run');
        return;
    }

    if (!input.ctx.trigger.type) {
        input.ctx.trigger = trigger;
    }

    var taskResolver = require('./tasks')(crossbow, config);
    var tasks = taskResolver.gather(cliInput);

    cb(null, tasks);

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