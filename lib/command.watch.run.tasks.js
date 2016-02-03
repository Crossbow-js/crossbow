const Rx           = require('rx');
const logger       = require('./logger');
const debugWatcher = require('debug')('cb:watcher');

module.exports = function (taskResolver, obj, ctx) {

    var runner;
    /**
     * Catch any errors when loading tasks from disk
     * this is to allow the watcher to continue
     */
    try {
        runner = getTaskRunner(taskResolver, obj, ctx);
    } catch (e) {
        if (e.stack) {
            console.log(e.stack);
        } else {
            console.log(e);
        }
        return Rx.Observable.empty();
    }

    /**
     * Create a state object in the shape we'd want observers to receive
     * it in. For example, someone who wants to log when a task run is complete
     * @type {Observable}
     */
    const state = Object.assign({}, obj, {tasks: runner.tasks, sequence: runner.sequence});

    /**
     * At this point we have a valid runner and can use the
     * series it provides. todo: allow All parallel running here also
     */
    const runnerComplete = runner
        .series()
        /**
         * If a task emits a value through onNext, capture
         * it and return empty - this allows this mapping
         * to only produce values when the runner completes
         */
        .flatMap(() => {
            // todo - what to do with emitted values from tasks
            debugWatcher(`> [id:${obj.event.watcherUID}] [${obj.event._id}] task emitted a value`);
            return Rx.Observable.empty();
        })
        /**
         * Log errors to the console, but return empty
         * to stop the process from exiting
         */
        .catch(e => {
            if (e.stack) {
                console.log(e.stack);
            } else {
                console.log(e);
            }
            return Rx.Observable.empty();
        })

    /**
     * Finally concat the runner + state obj will cause the runner to resolve
     * first and then project the state Obj
     */
    return Rx.Observable.concat(runnerComplete, Rx.Observable.just(state));
}

/**
 * @param {{event: object}} obj
 * @returns {Rx.Observable}
 */
function getTaskRunner (taskResolver, obj, ctx) {

    const trigger = Object.assign({}, obj.event, {type: 'watcher'});

    ctx.trigger = trigger;

    const runner = taskResolver.getRunner(obj.event.tasks, ctx);

    logger.info(`{yellow:+} {gray:[id:${obj.event.watcherUID}] [${obj.event._id}]} {gray:${runner.displayName.join(', ')}}`);

    return runner;
}
