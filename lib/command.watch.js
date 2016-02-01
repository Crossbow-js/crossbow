//const logger            = require('./logger');
//const utils             = require('./utils');
//const getBsConfig       = require('./utils').getBsConfig;
//const padCrossbowError  = require('./utils').padCrossbowError;
const gatherWatchTasks  = require('./gather-watch-tasks');
const resolve           = require('../lib/resolve-watch-tasks');
const Rx                = require('rx');
const createContext     = require('./ctx');
const logger            = require('./logger');
//const watch             = require('./watch');
//const splitTasks        = require('./bs').splitTasks;
const watcher           = require('./file-watcher');
const debug             = require('debug')('command:run');
const debugWatcher      = require('debug')('cb:watcher');

if (process.env.DEBUG) {
    Rx.config.longStackSupport = true;
}

/**
 * @param cli
 * @param input
 */
module.exports = function runWatcher (cli, input, config, cb) {

    const crossbow     = input.crossbow;
    const cliInput     = cli.input.slice(1);
    /**
     * Using the crossbow config given, gather all
     * possible watch tasks
     * @type {Array}
     */
    const tasks        = gatherWatchTasks(crossbow);
    /**
     * Now select the tasks that match the input given in the
     * cli. eg: 'watch dev'
     *       -> tasks under the 'dev' namespace
     * @type {Array|*}
     */
    const watcherTasks = resolve(cliInput, tasks);
    /**
     * Log file-watching information to the console
     */
    logWatchInfo(watcherTasks);

    /**
     * Create a task resolver from the provided crossbow configuration
     */
    const taskResolver = require('./tasks')(crossbow, config);
    /**
     * Merge any task specific 'before' tasks with any global
     * ones.
     */
    const beforeTasks  = resolve.resolveBeforeTasks(crossbow, tasks);
    /**
     * Now create a task runner from the merged 'before' tasks
     */
    const beforeRunner = taskResolver.getRunner(beforeTasks, ctx);
    /**
     * Now create a run sequence in series mode to allow
     * all before tasks to be run in exact order
     */
    const beforeSeries = beforeRunner.series();
    /**
     * Create a local context that is passed into each task
     */
    const ctx          = createContext(input);
    /**
     * Convert all watcher tasks into Observables that wrap the
     * chokidar file watcher.
     */
    const watchers     = watcher.getWatchers(watcherTasks);
    /**
     * Create a global pauser that can prevent all file watching
     * events from triggering any tasks
     * @type {BehaviorSubject<T>}
     */
    const pauser       = new Rx.BehaviorSubject(true);
    /**
     * Create a state obj for tracking which watcher tasks
     * are currently executing their tasks - this is to prevent
     * further triggers working whilst work is in process
     * // todo: Make this track an individual watchtask instead of the entire namespace
     * @type {BehaviorSubject<T>}
     */
    const tracker      = new Rx.BehaviorSubject(
        Object.keys(watcherTasks)
            .reduce((all, key) => {
                all[key] = {running: false};
                return all;
            }, {})
    );

    debugWatcher(`+ ${beforeRunner.tasks.valid.length} before task(s) loaded`);

    const completedTasks$ = Rx.Observable
        /**
         * Use concat to ensure the beforeTasks runner has
         * completed before starting the file-watchers.
         */
        .concat(beforeSeries, Rx.Observable.just(true))
        .do(x => debugWatcher(`√ before tasks completed`))
        /**
         * Flat map the stream coming from the file-watchers
         * into the main stream
         */
        .flatMapLatest(() => {
            return watchers
                /**
                 * Add the global pauser + state tracker to the
                 * stream of file-change events
                 */
                .withLatestFrom(pauser, tracker, (event, pauser, tracker) => ({event, pauser, tracker}))
                /**
                 * Only allow events through when global pauser is true
                 * + the current namespace is not running
                 */
                .filter(obj => {
                    return obj.pauser && !obj.tracker[obj.event.namespace].running;
                })
                /**
                 * Add a count to every triggering event
                 */
                .map((x, i) => {
                    x.event._id = i;
                    return x;
                })
                .do(obj => debugWatcher(`~ [id:${obj.event.watcherUID}] [${obj.event._id}] [${obj.event.event}] ${obj.event.path}`))
                /**
                 * Signal that the current namespace is currently running
                 */
                .do(x => {
                    x.tracker[x.event.namespace].running = true;
                    tracker.onNext(x.tracker);
                })
                /**
                 * Create a runner based on the tasks given
                 * in the watcher config for this item
                 */
                .flatMap(obj => {

                    var runner;
                    try {
                        runner = getTaskRunner(obj);
                    } catch (e) {
                        if (e.stack) {
                            logger.error(e.stack);
                        }
                        complete();
                        return Rx.Observable.empty();
                    }

                    function complete () {
                        obj.tracker[obj.event.namespace].running = false;
                        tracker.onNext(obj.tracker);
                    }

                    /**
                     * On successful completion of tasks,
                     * reset the tracker so that this namespace is
                     * no longer running
                     */
                    const runnerComplete = runner.series();
                    const confirmer = Rx.Observable.just(Object.assign({}, obj, {tasks: runner.tasks}));

                    runnerComplete.subscribeOnCompleted(() => complete());

                    return Rx.Observable.concat(runnerComplete, confirmer);
                });
        }).share();

    /**
     * @param {{event: object}} obj
     * @returns {Rx.Observable}
     */
    function getTaskRunner (obj) {
        const trigger = Object.assign({}, obj.event, {type: 'watcher'});

        ctx.trigger = trigger;

        const runner = taskResolver
            .getRunner(obj.event.tasks, ctx);

        debugWatcher(`+ [id:${obj.event.watcherUID}] [${obj.event._id}] running tasks: (${runner.tasks.valid.map(x => x.taskName)})`);

        return runner;
    }

    /**
     * Logging after a task is completed
     */
    completedTasks$
        .subscribe(obj => {
            //console.log(obj);
            debugWatcher(`√ [id:${obj.event.watcherUID}] [${obj.event._id}] tasks complete: (${obj.tasks.valid.map(x => x.taskName)})`);
        });

    completedTasks$
        .subscribe(x => {
            //console.log('Value', x);
        }, e => {
            //console.log('Error', e.stack);
        }, _ => {
            //console.log("Done");
        });

    return beforeSeries;

        //.subscribeOnCompleted(x => {
        //    debugWatcher(`√ before tasks`);
        //    //init.onNext(true);
        //    //setTimeout(() => {
        //    //    console.log('Setting FALSE');
        //    //    pauser.onNext(false)
        //    //}, 5000);
        //    //setTimeout(() => {
        //    //    console.log('Setting TRUE');
        //    //    pauser.onNext(true)
        //    //}, 10000);
        //});

    //watchers.subscribe(x => {
    //    console.log('VAL', x);
    //}, e => {
    //
    //}, _ => {
    //    console.log('DONE');
    //})

    //if (config.get('handoff')) {
    //    debug('handing off runner');
    //    return {tasks, watcherTasks, beforeTasks, beforeRunner, taskResolver};
    //}


    //if ()

    ///**
    // * Hydrate
    // * @type {Rx.ReplaySubject<T>}
    // */
    //ctx.tasksCompleted$ = new Rx.ReplaySubject();
    //ctx.utils           = utils;
    //
    //const watcherTasks    = watch(cli, tasks, config).getTasks(cliInput);
    //const watchers        = watcher.getWatchers(watcherTasks);
    //
    //const tasksSubject    = new Rx.Subject();
    //const tasksCompleted$ = tasksSubject.share();
    //const onSwitch        = new Rx.Subject();
    //const offSwitch       = new Rx.Subject();
    //const bsConfig        = getBsConfig(crossbow, config);
    //
    ///**
    // * Run Browsersync if user provided bs-config
    // */
    //require('./bs')(bsConfig, tasksCompleted$, crossbow);
    //
    ///**
    // * On tasksCompleted$ - re-enable the watchers
    // * and pump a value into ctx.events
    // */
    //tasksCompleted$
    //    .do(onSwitch.onNext.bind(onSwitch))
    //    .subscribe(ctx.tasksCompleted$); // pump completed tasks into events stream
    //
    ///**
    // * File watchers
    // */
    //const eventWhitelist = ['change', 'add'];
    //const watcherStream = watchers
    //    .filter(x => eventWhitelist.indexOf(x.event) > -1)
    //    .map(x => {
    //        x.tasks = splitTasks(x.tasks);
    //        return x;
    //    });
    //
    //const pauser = onSwitch.flatMapLatest(() => watcherStream.takeUntil(offSwitch));
    //
    //pauser
    //    .do(() => offSwitch.onNext(true))
    //    .do(runCommandAfterWatch)
    //    .subscribe();
    //
    ///**
    // * Create task resolver.
    // */
    //const taskResolver = require('./tasks')(crossbow, config);
    //
    ///**
    // * Run & complete and 'before' tasks
    // */
    //require('./tasks-before')(taskResolver, tasks, ctx)
    //    .subscribe(function () {
    //
    //    }, function (err) {
    //        console.error(err);
    //    }, function () {
    //        logWatchInfo(watcherTasks);
    //        onSwitch.onNext(true);
    //    });
    //
    //logger.debug('Running watcher with tasks', watcherTasks);
    //
    ///**
    // * @param taskItem
    // * @param event
    // * @param file
    // * @returns {*}
    // */
    //function runCommandAfterWatch (event) {
    //
    //    const tasks   = event.tasks.valid;
    //    input.handoff = true;
    //
    //    ctx.trigger = {
    //        type: 'watcher',
    //        event: event.event,
    //        item: event.item,
    //        tasks: event.tasks,
    //        path: event.path
    //    };
    //
    //    const runner = taskResolver.getRunner(tasks, ctx);
    //
    //    if (event.tasks.valid.length) {
    //        logger.info('{gray:running ::} {yellow:' + event.tasks.valid.join(' {gray:->} '));
    //    }
    //
    //    var errored = false;
    //
    //    /**
    //     * Mark the start time of the full running sequence
    //     * @type {number}
    //     */
    //    const timeStart = new Date().getTime();
    //
    //    ((runMode) => {
    //
    //        /**
    //         * Choose either 'series' or 'parallel' based
    //         * on which options were given
    //         */
    //        return runner[runMode].call();
    //
    //    })(config.get('runMode'))
    //        /**
    //         * Here we *swallow* errors on their way through and log them to the
    //         * console + browser.
    //         * We return an empty Observable to allow the task that caused
    //         * the error to 'complete', whilst not actually halting the stream
    //         */
    //        .catch(err => {
    //
    //            errored = true;
    //
    //            if (err.crossbowMessage) {
    //                console.log(padCrossbowError(err.crossbowMessage));
    //            } else {
    //                if (!err._cbDisplayed) {
    //                    if (config.get('stack')) {
    //                        console.log(err.stack);
    //                    } else {
    //                        console.log(err.toString());
    //                    }
    //                }
    //            }
    //
    //            // continue through so this sequence does not stop
    //            return Rx.Observable.empty();
    //        })
    //        .do(() => {
    //            //debug(`> Received a value from a task ${x.from.task.taskName}:`);
    //            //debug(`> ${x.value}`);
    //        })
    //        /**
    //         * Calling toArray will force the completion callback
    //         * to only fire once each task/observable signals completion
    //         */
    //        .toArray()
    //        .subscribe(
    //            () => {},
    //            e => {
    //                if (e.crossbowMessage) {
    //                    console.log(e.crossbowMessage);
    //                } else {
    //                    console.log(e.stack);
    //                }
    //            },
    //            () => {
    //
    //                if (!errored) {
    //                    if (event.tasks.valid.length) {
    //                        require('../reporters/default')(runner, config, new Date().getTime() - timeStart);
    //                    }
    //                }
    //
    //                tasksSubject.onNext(event);
    //
    //                cb(null, runner);
    //            }
    //        );
    //
    //}
};

function logWatchInfo(watcherTasks) {

    Object.keys(watcherTasks).forEach(function (taskName) {
        watcherTasks[taskName].watchers.forEach(watcher => {
            logger.info(
                '{gray:watching ::} {yellow:%s} {cyan:[%s]} -> {cyan:%s}',
                taskName,
                watcher.patterns.join(', '),
                watcher.tasks.join(', '));
        });
    });
    logger.info('{gray:-------- ::}');
}
