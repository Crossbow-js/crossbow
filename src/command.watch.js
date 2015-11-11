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

    /**
     * Hydrate
     * @type {Rx.ReplaySubject<T>}
     */
    ctx.tasksCompleted$ = new Rx.ReplaySubject();
    ctx.utils           = utils;

    var watcherTasks    = watch(cli, tasks, config).getTasks(cliInput);
    var watchers        = watcher.getWatchers(watcherTasks);

    var tasksSubject    = new Rx.Subject();
    var tasksCompleted$ = tasksSubject.publish().refCount();
    var onSwitch        = new Rx.Subject();
    var offSwitch       = new Rx.Subject();
    var bsConfig        = getBsConfig(crossbow, config);

    /**
     * Run Browsersync if user provided bs-config
     */
    require('./bs')(bsConfig, tasksCompleted$, crossbow);

    /**
     * On tasksCompleted$ - re-enable the watchers
     * and pump a value into ctx.events
     */
    tasksCompleted$
        .do(onSwitch.onNext.bind(onSwitch))
        .subscribe(ctx.tasksCompleted$); // pump completed tasks into events stream

    /**
     * File watchers
     */
    var eventWhitelist = ['change', 'add'];
    var watcherStream = watchers
        .filter(x => eventWhitelist.indexOf(x.event) > -1)
        .map(x => {
            x.tasks = splitTasks(x.tasks);
            return x;
        });

    var pauser = onSwitch
        .flatMapLatest(x => watcherStream.takeUntil(offSwitch));

    pauser
        .do(x => offSwitch.onNext(true))
        .do(runCommandAfterWatch)
        .subscribe();

    /**
     * Create task resolver.
     */
    taskResolver = require('./tasks')(crossbow, config);

    /**
     * Run & complete and 'before' tasks
     */
    require('./tasks-before')(taskResolver, tasks, ctx)
        .subscribe(function () {

        }, function (err) {
            console.error(err);
        }, function () {
            logWatchInfo(watcherTasks);
            onSwitch.onNext(true);
        });

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
                if (!err._cbDisplayed) {
                    console.log(err);
                }
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
                require('./reporter')(runner, config);
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

function logWatchInfo(watcherTasks) {
    watcherTasks.forEach(function (task, i) {
        task.patterns.forEach(function (pattern) {
            logger.info('{gray:watching ::} {yellow:%s}', pattern);
        })
    });
    logger.info('{gray:-------- ::}');
}