var exists                  = require('fs').existsSync;
var resolve                 = require('path').resolve;
var runCommand              = require('./command.run.js');
var cli                     = require('../');
var logger                  = require('./logger');
var utils                   = require('./utils');
var getBsConfig             = require('./utils').getBsConfig;
var arrayify                = require('./utils').arrarify;
var getPresentableTaskList  = require('./utils').getPresentableTaskList;
var padCrossbowError        = require('./utils').padCrossbowError;
var getBsConfig             = require('./utils').getBsConfig;
var gatherTasks             = require('./gather-watch-tasks');
var Rx                      = require('rx');
var createContext           = require("./ctx");
var watch                   = require("./watch");
var splitTasks              = require('./bs').splitTasks;
var objPath                 = require('object-path');
var watcher                 = require("./file-watcher");
var taskResolver;

module.exports = function (cli, input, config, cb) {
    var beforeTasks = input.crossbow.watch.before || [];
    return runWatcher(cli, input, config, cb);
};

/**
 * @param cli
 * @param input
 */
function runWatcher (cli, input, config, cb) {

    var crossbow     = input.crossbow;
    var cliInput     = cli.input.slice(1);
    var tasks        = gatherTasks(crossbow, cliInput);
    var ctx          = createContext(input);
    var watcherTasks = watch(cli, tasks, config).getTasks(cliInput);
    var watchers     = watcher.getWatchers(watcherTasks);
    var tasksSubject = new Rx.Subject();
    var taskStream   = tasksSubject.publish().refCount();
    var bs;
    var onSwitch     = new Rx.Subject();
    var offSwitch    = new Rx.Subject();
    var bsConfig     = getBsConfig(crossbow, config);

    logWatchInfo(watcherTasks);

    if (bsConfig) {
        bsConfig.logFileChanges = false;
        bsConfig.logPrefix = function () {
            return this.compile(logger.prefix);
        };
        bs = require('browser-sync').create('Crossbow');
        bs.init(bsConfig, function (err, _bs) {
            if (err) {
                return cb(err);
            }
        });
    }

    taskStream
        .do(x => {
            if (!bs) {
                return;
            }
            x.tasks.bsTasks.forEach(function (task) {
                if (task.args.length) {
                    task.args = utils.transformStrings(task.args, crossbow.config);
                }
                if (typeof bs[task.method] === 'function') {
                    if (task.args.length) {
                        bs[task.method].apply(bs, task.args);
                    } else {
                        bs[task.method].call(bs);
                    }
                }
            });
        })
        .do(onSwitch.onNext.bind(onSwitch))
        .subscribe();

    var watcherStream = watchers
        .filter(x => x.event === 'change')
        .map(x => {
            x.tasks = splitTasks(x.tasks);
            return x;
        });

    var pauser = onSwitch.flatMapLatest(x => watcherStream.takeUntil(offSwitch))

    pauser
        .do(x => offSwitch.onNext(true))
        .do(runCommandAfterWatch)
        .subscribe();

    onSwitch.onNext(true);

    taskResolver = require('./tasks')(crossbow, config);

    logger.debug('Running watcher with tasks', watcherTasks);

    /**
     * @param taskItem
     * @param event
     * @param file
     * @returns {*}
     */
    function runCommandAfterWatch (event) {

        ctx.trigger = {
            type: "watcher",
            event: event.event,
            item: event.item,
            tasks: event.tasks,
            path: event.path
        };

        var start  = new Date().getTime();
        var tasks  = event.tasks.valid;

        logger.info('{gray:running ::} {yellow:' + tasks.join(' {gray:->} '));

        input.handoff = true;

        var runner = taskResolver.getRunner(tasks, ctx);
        var errored = false;

        /**
         * Here we swallow errors on their way through and log them to the
         * console + browser.
         * We return an empty Observable to allow the task that caused
         * the error to 'complete', whilst not actually halting the stream
         */
        function logIncomingErrors (err) {

            errored = true;

            if (err.crossbowMessage) {
                console.log(padCrossbowError(err.crossbowMessage));
                //bs.notify(`<span style="color: red; display: block; text-align: left">Error from task ${e.task.taskName}</span><span style="text-align: left!important; display: block; width: 100%;">${e}</span>`, 5000);
            } else {
                console.log(err);
            }

            return Rx.Observable.empty(); // continue through so this sequence does not stop
        }


        /**
         * If a task calls onNext, we'll receive that here
         * @param {*} x
         */
        function handleValueReceived (x) {
            logger.debug('got a value', x);
        }

        /**
         * Log errors to the console
         * @param {Error} e
         */
        function handleIncomingError (e) {
            if (e.crossbowMessage) {
                console.log(e.crossbowMessage);
            } else {
                console.log(e.stack);
            }
        }

        /**
         * The task completed, with possible errors
         */
        function handleTaskCompleted () {
            if (!errored) {
                logger.info('{ok: } Completed in {cyan:' + String(new Date().getTime() - start) + 'ms');

                if (runner.tasks.valid.length) {
                    if (config.get('summary') !== 'short') {
                        logTasks(runner.tasks.valid, config.get('summary'));
                    }
                } else {
                    logger.info('{ok: } {yellow:' + tasks.bsTasks.map(function (x) {
                            return 'Browsersync: ' + x.method;
                        }).join('-'));
                }
            }

            tasksSubject.onNext(event);

            cb(null, runner);
        }

        runner
            .run
            .catch(logIncomingErrors)
            .subscribe(
                handleValueReceived,
                handleIncomingError,
                handleTaskCompleted
            );
    }
}

function logSubTasks (tasks) {
    tasks.forEach(function (task) {
        logger.info('{gray:- ' + task.taskName);
        if (task.tasks.length) {
            logSubTasks(task.tasks);
        }
    });
}

function logTasks (tasks, summary) {
    tasks.forEach(function (task) {
        logger.info('{ok: } {yellow:' + task.taskName);
        if (task.tasks.length && summary === 'verbose') {
            logSubTasks(task.tasks);
        }
    });
}

function logWatchInfo(watcherTasks) {
    watcherTasks.forEach(function (task, i) {
        task.patterns.forEach(function (pattern) {
            logger.info('{gray:watching ::} {yellow:%s}', pattern);
        })
    });
    logger.info('{gray:-------- ::}');
}