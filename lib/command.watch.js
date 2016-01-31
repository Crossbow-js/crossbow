//const logger            = require('./logger');
//const utils             = require('./utils');
//const getBsConfig       = require('./utils').getBsConfig;
//const padCrossbowError  = require('./utils').padCrossbowError;
const gatherWatchTasks  = require('./gather-watch-tasks');
const resolve           = require('../lib/resolve-watch-tasks');
const Rx                = require('rx');
const createContext     = require('./ctx');
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
    const tasks        = gatherWatchTasks(crossbow);
    const watcherTasks = resolve(cliInput, tasks);
    const beforeTasks  = resolve.resolveBeforeTasks(crossbow, tasks);

    const taskResolver = require('./tasks')(crossbow, config);
    const ctx          = createContext(input);

    const beforeRunner = taskResolver.getRunner(beforeTasks, ctx);

    const watchers     = watcher
        .getWatchers(watcherTasks)
        .map((x, i) => {
            x._id = i;
            return x;
        });

    const pauser       = new Rx.BehaviorSubject(true);
    const beforeSeries = beforeRunner.series();

    const stream$ = Rx.Observable
        .concat(beforeSeries, Rx.Observable.just(true))
        .flatMapLatest(x => {
            return watchers
                .withLatestFrom(pauser, (event, pauser) => ({event, pauser}))
                .filter(obj => obj.pauser)
                .do(obj => debugWatcher(`~ [${obj.event.uid}] [${obj.event.event}] ${obj.event.path}`))
                .do(x => pauser.onNext(false)) // Stop accepting events
                .flatMap(x => {
                    const runner = taskResolver
                        .getRunner(x.event.tasks, ctx)
                        .series();
                    runner.subscribeOnCompleted(x => pauser.onNext(true));
                    return runner;
                });
        }).share();

    //stream$.subscribe(x => {
    //        //console.log('Value', x);
    //    }, e => {
    //        console.log('Error', e);
    //    }, _ => {
    //        console.log("Done");
    //    });

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

//function logWatchInfo(watcherTasks) {
//    watcherTasks.forEach(function (task) {
//        task.patterns.forEach(function (pattern) {
//            logger.info('{gray:watching ::} {yellow:%s}', pattern);
//        });
//    });
//    logger.info('{gray:-------- ::}');
//}
