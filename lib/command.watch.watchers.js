const debugWatcher      = require('debug')('cb:watcher');

/**
 * Return a stream of file-change events that only
 * occur if the tasks associated to that watcher have completed
 * @param {Rx.Observable} watchers
 * @param {Rx.Observable} state$
 * @returns {Rx.Observable}
 */
module.exports = function (watcherTasks, state$) {
    /**
     * Convert all watcher tasks into Observables that wrap the
     * chokidar file watcher.
     */
    const watchers     = require('./file-watcher').getWatchers(watcherTasks);

    return watchers
        /**
         * Add the state tracker to the
         * stream of file-change events
         */
        .withLatestFrom(state$, (event, state) => ({event, state}))
        /**
         * Only allow events through when the current namespace is not running
         */
        .filter(obj => {
            const canRun = !obj.state[obj.event.watcherUID].running;
            if (!canRun) {
                //debugWatcher(`x [id:${obj.event.watcherUID}] [${obj.event.event}] ${obj.event.path} IGNORED`);
            }
            return canRun;
        })
        /**
         * Add a count to every triggering event
         */
        .map((x, i) => {
            x.event._id = i;
            return x;
        })
        .do(obj => {
            debugWatcher(`~ [id:${obj.event.watcherUID}] [${obj.event._id}] [${obj.event.event}] ${obj.event.path}`);
        });
}
