var exists      = require('fs').existsSync;
var resolve     = require('path').resolve;
var runCommand  = require('./command.run.js');
var logger      = require('./logger');
var getBsConfig = require('./utils').getBsConfig;
var arrayify    = require('./utils').arrarify;
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

    var crossbow    = opts.pkg.crossbow;
    var args        = cli.input.slice(1);
    var bsConfig    = getBsConfig(crossbow, opts);
    var watchConfig = {ignoreInitial: true};
    var tasks       = gatherTasks(crossbow, args);
    var bs          = require('browser-sync').create();
    bsConfig.files  = bsConfig.files || [];

    bsConfig.files = bsConfig.files.concat(tasks.map(function (task, i) {
        task.locked = false;
        return {
            options: task.options || watchConfig,
            match: task.patterns,
            fn: runCommandAfterWatch.bind(null, task)
        };
    }));

    bs.init(bsConfig, function (err, bs) {
        opts.cb(null, {
            bsConfig: bsConfig,
            tasks: tasks,
            bs: bs
        });
    });

    function runCommandAfterWatch (task, event, file) {

        var start = new Date().getTime();

        if (task.locked) {
            return;
        }

        task.locked = true;
        opts.handoff = true;

        opts._ctx.trigger = {
            type: 'watcher',
            task: task,
            event: event,
            file: file,
            opts: opts
        };

        runCommand({input: ['run'].concat(task.tasks)}, opts)
            .then(function () {
                logger.info('{yellow:%s} {cyan:::} %sms', task.tasks.join(' -> '), new Date().getTime() - start);
                task.locked = false;
            })
            .progress(function (obj) {
                if (obj.level && obj.msg) {
                    logger[obj.level].apply(logger, arrayify(obj.msg));
                }
            })
            .catch(function (err) {

                task.locked = false;

                logger.error('{err: } Following error from {cyan:%s} task', task.tasks.join(' -> '));
                logger.error('{err: } %s', err.message);

                if (!err.crossbow_silent) {
                    console.log(err);
                }
                //bs.notify(err.message);
            }).done();
    }
}
