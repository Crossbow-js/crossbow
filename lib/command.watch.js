const gatherWatchTasks  = require('./gather-watch-tasks');
const resolve           = require('../lib/resolve-watch-tasks');
const createContext     = require('./ctx');
const logger            = require('./logger');
const Rx                = require('rx');
const debugWatcher      = require('debug')('cb:watcher');

/**
 *
 */
function unwrapWatchArguments (input, config, cliInput) {
    if (!config[input]) {
        if (input.indexOf('->') > -1) {
            const split = input.split('->').map(x => x.trim());
            config['_default'] = {
                watchers: [
                    {
                        patterns: split[0],
                        tasks: split.slice(1)
                    }
                ]
            };
            cliInput.push('_default');
        }
    }
}

if (process.env.DEBUG) {
    Rx.config.longStackSupport = true;
}

/**
 * @param {Object} cli
 * @param {Object} input
 */
module.exports = function runWatcher (cli, input, config) {

    const crossbow    = input;
    const watchConfig = Object.assign({tasks:{}}, crossbow.watch || {});
    const cliInput    = cli.input.slice(1);

    cliInput.forEach(function (item) {
        unwrapWatchArguments(item, watchConfig.tasks, cliInput);
    });

    /**
     * Using the crossbow config given, gather all
     * possible watch tasks
     * @type {Array}
     */
    const tasks = gatherWatchTasks({watch: watchConfig});

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
    const taskResolver = require('./tasks')(input, config);
    /**
     * Merge any task specific 'before' tasks with any global
     * ones.
     */
    const beforeTasks  = resolve.resolveBeforeTasks(input, tasks);
    /**
     * Create a local context that is passed into each task
     */
    const ctx          = createContext(input);
    /**
     * Now create a task runner from the merged 'before' tasks
     */
    const beforeRunner = taskResolver.getRunner(beforeTasks, ctx);
    debugWatcher(`+ ${beforeRunner.tasks.valid.length} before task(s) loaded`);

    /**
     * Now create a run sequence in series mode to allow
     * all before tasks to be run in exact order
     */
    const beforeSeries = beforeRunner.series();

    /**
     * Create a state manager for pausing watchers whilst tasks are running
     * @type {{state, state$, start$, stop$}|*}
     */
    const stateManager = require('./command.watch.state')(watcherTasks);

    ctx.stateManager = stateManager;
    /**
     * For every file-change event coming from the watcher, trigger a new runner
     * with the tasks listed for that pattern
     */
    const taskRunner = require('./command.watch.run.tasks');

    /**
     * First run the before tasks series until they complete.
     */
    const completedTasks$ = Rx.Observable
        .concat(beforeSeries, Rx.Observable.just(true))
        .do(() => debugWatcher(`√ before tasks completed`))
        /**
         * Now flat map the stream coming from the file-watchers
         */
        .flatMap(() => {
            return require('./command.watch.watchers')(watcherTasks, stateManager.state$);
        })
        /**
         * Update the current state to inform we're
         * about to start a task-run
         */
        .timestamp()
        .do(stateManager.start$)
        /**
         * Create/call the runner for this set of tasks
         */
        .flatMap(obj => taskRunner(taskResolver, obj.value, ctx))
        .do(x => logTaskComplete(x, config))
        .timestamp()
        .share();

    /**
     * Log when a task run is complete
     */
    completedTasks$
        .do(stateManager.stop$)
        .subscribe(() => {
            // noop
        }, (e) => {
            console.log('Error', e.stack);
        }, () => {
            // console.log("Done");
        });

    /**
     * Inform the state that this run is complete
     */
    completedTasks$
        .subscribe(stateManager.stop$);

    return completedTasks$;
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


function logTaskComplete (obj, config) {

    if (config.get('summary') === 'verbose') {
        obj.sequence.forEach(function (item) {
            const se = require('./sequence').getSeqTime(item);
            logger.info(`{green:√} {gray:[id:${obj.event.watcherUID}] [${obj.event._id}] ${se}ms ${item.task.taskName}}`);
        })
    }
    const total = require('./sequence').getSeqTimeMany(obj.sequence);
    logger.info(`{green:√} {gray:[id:${obj.event.watcherUID}] [${obj.event._id}] ${total}ms total`);
}
