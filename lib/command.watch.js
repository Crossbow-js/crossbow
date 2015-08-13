var exists = require('fs').existsSync;
var resolve = require('path').resolve;
var runCommand = require('./command.run.js');
var cli = require('../');
var logger = require('./logger');
var getBsConfig = require('./utils').getBsConfig;
var arrayify = require('./utils').arrarify;
var getPresentableTaskList = require('./utils').getPresentableTaskList;
var gatherTasks = require('./gather-watch-tasks');

module.exports = function (cli, opts, trigger) {
    var beforeTasks = opts.crossbow.watch.before || [];
    return runWatcher(cli, opts, trigger);
};

/**
 * @param cli
 * @param opts
 */
function runWatcher(cli, opts, trigger) {

    var crossbow = opts.crossbow;
    var cliInput = cli.input.slice(1);
    var tasks = gatherTasks(crossbow, cliInput);
    var bsConfig = getBsConfig(crossbow, opts);
    var watchConfig = { ignoreInitial: true };
    var config = trigger.config;

    if (!cliInput.length) {
        if (tasks['default']) {
            processInput([tasks['default']]);
        } else {
            throw new Error('No watch targets given and no `default` found');
        }
    } else {

        var keys = Object.keys(tasks);

        var matching = cliInput.filter(function (x) {
            return keys.indexOf(x) > -1;
        });

        if (matching.length !== cliInput.length && config.get('strict')) {
            throw new Error('You tried to run the watch tasks `' + cliInput.join(', ') + '`' + ' but only  `' + matching.join(' ') + '` were found in your config.');
        }

        var tsk = matching.reduce(function (all, item) {
            return all.concat(tasks[item]);
        }, []);

        processInput(tsk);
    }

    function processInput(tasks) {

        var bs = require('browser-sync').create();

        bsConfig.files = bsConfig.files || [];

        bsConfig.logPrefix = function () {
            return this.compile(logger.prefix);
        };

        bsConfig.logFileChanges = false;

        bsConfig.files = bsConfig.files.concat(tasks.map(function (task, i) {
            return {
                options: task.options || watchConfig,
                match: task.patterns,
                fn: runCommandAfterWatch.bind(bs, task, opts)
            };
        }));

        bs.init(bsConfig, function (err, bs) {
            //console.log('running');
            //opts.cb(null, {
            //    bsConfig: bsConfig,
            //    tasks: tasks,
            //    bs: bs,
            //    opts: opts
            //});
        });
    }

    /**
     * @param task
     * @param opts
     * @param event
     * @param file
     * @returns {*}
     */
    function runCommandAfterWatch(task, opts, event, file, cb) {

        var bs = this;

        if (event !== 'change' || task.locked) {
            return;
        }

        cb = cb || function () {};

        var start = new Date().getTime();
        var crossbow = opts.crossbow;

        var bstest = function bstest(x) {
            return x.match(/^bs:(.+)/);
        };

        var bsTasks = task.tasks.filter(bstest).map(function (x) {
            return x.split(":");
        }).map(function (x) {
            return {
                method: x[1],
                args: x.slice(2)
            };
        });

        var valid = task.tasks.filter(function (x) {
            return !bstest(x);
        });

        task.locked = true;
        opts.handoff = true;

        runCommand({
            input: ["run"].concat(valid)
        }, opts, {
            type: 'watcher',
            task: task,
            event: event,
            file: file,
            opts: opts,
            filepath: resolve(opts.cwd, file),
            type: 'watcher',
            config: trigger.config.set('cb', function (err, output) {
                if (err) {
                    console.log('Got error bro');
                    console.error(err);
                } else {
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
                    logger.info('{yellow:' + valid.join(' -> ') + '{cyan: ' + String(new Date().getTime() - start) + 'ms');
                    task.locked = false;
                }
            })
        });
    }
}

/**
 * Create the sequence of promises
 */
//var promSeq = runCommand({input: ['run'].concat(validTasks)}, opts, {
//    type: 'watcher',
//    task: task,
//    event: event,
//    file: file,
//    opts: opts,
//    filepath: resolve(opts.cwd, file)
//});
//
///**
// * If in a testing env, just return the promises
// */
//if (process.env.TEST === 'true') {
//    return promSeq;
//}
//
//var presentableTasks = getPresentableTaskList(task.tasks);
//
///**
// * Otherwise, start running the promises
// * in sequence
// */
//promSeq
//    .then(function () {
//        logger.info('{yellow:%s} {cyan:::} %sms', presentableTasks.join(' -> '), new Date().getTime() - start);
//        if (bsTasks.length) {
//            bsTasks.forEach(function (task) {
//                if (typeof bs[task.method] === 'function') {
//                    if (task.args.length) {
//                        bs[task.method].apply(bs, task.args);
//                    } else {
//                        bs[task.method].call(bs);
//                    }
//                }
//            });
//        }
//        cb(null, bs);
//        setTimeout(function () {
//            task.locked = false;
//        }, 500);
//    })
//    .progress(function (obj) {
//        if (obj.level && obj.msg) {
//            logger[obj.level].apply(logger, arrayify(obj.msg));
//        }
//    })
//    .catch(function (err) {
//        setTimeout(function () {
//            task.locked = false;
//        }, 500);
//        if (!err.crossbow_silent) {
//            logger.error('{err: } Following error from {cyan:%s} task', presentableTasks.join(' -> '));
//            logger.error('{err: } %s', err.message);
//            console.log(err);
//        }
//
//        cb(err);
//    }).done();
//}

//module.exports.runCommandAfterWatch = runCommandAfterWatch;