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
            fn: runCommandAfterWatch.bind(bs, task, opts)
        };
    }));

    bs.init(bsConfig, function (err, bs) {
        opts.cb(null, {
            bsConfig: bsConfig,
            tasks: tasks,
            bs: bs,
            opts: opts
        });
    });
}

/**
 * @param task
 * @param opts
 * @param event
 * @param file
 * @returns {*}
 */
function runCommandAfterWatch (task, opts, event, file, cb) {

    var bs = this;

    cb = cb || function () {};

    if (task.locked) {
        return;
    }

    var start = new Date().getTime();
    var validTasks = [];

    var bsTasks    = task.tasks.filter(function (one) {
        var match  = one.match(/^bs:(.+)/);
        if (match) {
            return true;
        }
        // If not a BS task, push onto validTasks array
        validTasks.push(one);
    }).map(function (task) {
        var segs = task.split(":").slice(1);
        return {
            method: segs[0],
            args: segs.slice(1)
        }
    });

    task.locked = true;
    opts.handoff = true;

    opts._ctx.trigger = {
        type: 'watcher',
        task: task,
        event: event,
        file: file,
        opts: opts
    };

    /**
     * Create the sequence of promises
     */
    var promSeq = runCommand({input: ['run'].concat(validTasks)}, opts);

    /**
     * If in a testing env, just return the promises
     */
    if (process.env.TEST === 'true') {
        return promSeq;
    }

    /**
     * Otherwise, start running the promises
     * in sequence
     */
    return promSeq
        .then(function () {
            logger.info('{yellow:%s} {cyan:::} %sms', task.tasks.join(' -> '), new Date().getTime() - start);
            task.locked = false;
        })
        .then(function () {
            if (bsTasks.length) {
                bsTasks.forEach(function (task) {
                    if (typeof bs[task.method] === 'function') {
                        if (task.args.length) {
                            bs[task.method].apply(bs, task.args);
                        } else {
                            bs[task.method].call(bs);
                        }
                    }
                });
            }
            cb(null, bs);
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

            cb(err);

            //bs.notify(err.message);
        }).done();
}

module.exports.runCommandAfterWatch = runCommandAfterWatch;