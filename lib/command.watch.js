var exists      = require('fs').existsSync;
var resolve     = require('path').resolve;
var runCommand  = require('./command.run.js');
var logger      = require('./logger');
var getBsConfig = require('./utils').getBsConfig;
var gatherTasks = require('./gather-tasks');

module.exports = function (cli, opts) {

    var beforeTasks   = opts.pkg.crossbow.watch.before || [];

    //if (beforeTasks.length) {
    //    logger.info('running {cyan:%s} before watcher starts', beforeTasks);
    //    opts._ctx.trigger = {
    //        type:  'before',
    //        tasks: beforeTasks
    //    };
    //    runCommand({input: ['run'].concat(beforeTasks)}, opts)
    //        .then(function () {
    //            logger.info('{ok: } {cyan:%s} completed', beforeTasks);
    //            runWatcher(cli, opts);
    //        }).catch(function (err) {
    //            console.log(err.message);
    //            console.log(err.stack);
    //        }).done();
    //} else {
    //}

    return runWatcher(cli, opts);
};

/**
 * @param cli
 * @param opts
 */
function runWatcher (cli, opts) {

    var crossbow = opts.pkg.crossbow;
    var args     = cli.input.slice(1);
    var bsConfig = getBsConfig(crossbow, opts);

    var tasks    = gatherTasks(crossbow, args);
    var bs       = require('browser-sync').create();

    bs.init(bsConfig, function (err, bs) {
        opts.cb(null, {
            bsConfig: bsConfig,
            tasks: tasks,
            bs: bs
        });
    });

    //opts.pkg.crossbow.watch.tasks.forEach(function (item) {
    //
    //    Object.keys(item).forEach(function (key) {
    //
    //        if (typeof item[key] === "string") {
    //
    //            var match = item[key].match(/^bs:(.+?)$/);
    //
    //            if (typeof bs[match[1]] === "function") {
    //
    //                logger.info('watching {yellow:%s} -> {cyan:%s}', key, bs[match[1]]);
    //                bs.watch(key, watchConfig, bs[match[1]]);
    //            }
    //
    //        } else { // array of tasks given
    //
    //            var locked       = false;
    //            var tasks        = item[key];
    //            var regularTasks = tasks[0];
    //            var bsTask;
    //
    //            if (tasks.length > 1) {
    //                regularTasks = tasks.slice(0, -1);
    //                bsTask       = tasks[tasks.length - 1];
    //            } else {
    //                regularTasks = [regularTasks];
    //            }
    //
    //            var bsMethod;
    //            var bsArgs;
    //
    //            if (bsTask && bsTask.match(/^bs:/)) {
    //                bsMethod = bsTask.split(":")[1];
    //                bsArgs   = bsTask.split(":").slice(2);
    //            }
    //
    //            var watchPatterns = getKey(key, opts);
    //
    //            logger.info('watching {yellow:%s} -> {cyan:%s}', watchPatterns, regularTasks);
    //
    //            bs.watch(watchPatterns, watchConfig, function (event, file) {
    //
    //                if (locked) {
    //                    return;
    //                }
    //
    //                locked = true;
    //                var start = new Date().getTime();
    //
    //                opts._ctx.trigger = {
    //                    type: 'watcher',
    //                    pattern: watchPatterns,
    //                    file: file,
    //                    event: event
    //                };
    //
    //                _cli({input: ['run'].concat(regularTasks)}, opts)
    //                    .then(function () {
    //                        logger.info('{yellow:%s} {cyan:::} %sms', regularTasks.join(' -> '), new Date().getTime() - start);
    //
    //                        if (typeof bs[bsMethod] === 'function') {
    //                            if (bsArgs.length) {
    //                                bs[bsMethod].apply(bs, bsArgs);
    //                            } else {
    //                                bs[bsMethod].apply(bs);
    //                            }
    //                        }
    //                        locked = false;
    //                    })
    //                    .progress(function (obj) {
    //                        logger[obj.level].apply(logger, obj.msg);
    //                    })
    //                    .catch(function (err) {
    //                        locked = false;
    //                        if (!err.crossbow_silent) {
    //                            console.log(err.message);
    //                            console.log(err.stack);
    //                        }
    //                        bs.notify(err.message);
    //                    }).done();
    //            })
    //        }
    //    });
    //});
}
