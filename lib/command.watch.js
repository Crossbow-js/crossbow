const gatherWatchTasks  = require('./gather-watch-tasks');
const resolve           = require('../lib/resolve-watch-tasks');
const Rx                = require('rx');
const createContext     = require('./ctx');
const logger            = require('./logger');
const watcher           = require('./file-watcher');
const debugWatcher      = require('debug')('cb:watcher');

if (process.env.DEBUG) {
    Rx.config.longStackSupport = true;
}

/**
 * @param cli
 * @param input
 */
module.exports = function runWatcher (cli, input, config) {

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
    const state = new Rx.BehaviorSubject(
        Object.keys(watcherTasks)
            .reduce((all, key) => {
                all[key] = {running: false};
                return all;
            }, {})
    );

    debugWatcher(`+ ${beforeRunner.tasks.valid.length} before task(s) loaded`);

    const watchers$ = Rx.Observable
        /**
         * Use concat to ensure the beforeTasks runner has
         * completed before starting the file-watchers.
         */
        .concat(beforeSeries, Rx.Observable.just(true))
        .do(() => debugWatcher(`√ before tasks completed`))
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
                .withLatestFrom(pauser, state, (event, pauser, state) => ({event, pauser, state}))
                /**
                 * Only allow events through when global pauser is true
                 * + the current namespace is not running
                 */
                .filter(obj => {
                    return obj.pauser && !obj.state[obj.event.namespace].running;
                })
                /**
                 * Add a count to every triggering event
                 */
                .map((x, i) => {
                    x.event._id = i;
                    return x;
                })
                .do(obj => debugWatcher(`~ [id:${obj.event.watcherUID}] [${obj.event._id}] [${obj.event.event}] ${obj.event.path}`))
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

    //const start = (key) => {
    //    return (state) => {
    //        const obj = Object.assign({}, state);
    //        obj[key].running = true;
    //        return state;
    //    }
    //};
    //const stop = (key) => {
    //    return (state) => {
    //        const obj = Object.assign({}, state);
    //        obj[key].running = false;
    //        return state;
    //    }
    //};

    /**
     * For every file-change event, trigger a new runner
     * with the tasks listed for that pattern
     */
    const completedTasks$ = watchers$
        .flatMap(obj => {
            var runner;
            /**
             * Catch any errors when loading tasks from disk
             * this is to allow the watcher to continue
             */
            try {
                runner = getTaskRunner(obj);
            } catch (e) {
                if (e.stack) {
                    logger.error(e.stack);
                } else {
                    logger.error(e);
                }
                return Rx.Observable.empty();
            }

            /**
             * At this point we have a valid runner and can use the
             * series it provides. todo: All parallel running here also
             */
            const runnerComplete = runner.series();

            /**
             * Create a state object in the shape we'd want observers to receive
             * it in. For example, someone who wants to log when a task run is complete
             * @type {Observable}
             */
            const stateObj = Rx.Observable.just(Object.assign({}, obj, {tasks: runner.tasks}));

            /**
             * Finally concat the runner + state obj will cause the runner to resolve
             * first and then project the state Obj
             */
            return Rx.Observable.concat(runnerComplete, stateObj);
        });

    /**
     * Log when a task run is complete
     */
    completedTasks$.subscribe(obj => {
            debugWatcher(`√ [id:${obj.event.watcherUID}] [${obj.event._id}] tasks complete: (${obj.tasks.valid.map(x => x.taskName)})`);
        }, e => {
            console.log('Error', e.stack);
        }, () => {
            //console.log("Done");
        });

    return beforeSeries;
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
