const Rx                = require('rx');

/**
 * @param cli
 * @param input
 */
module.exports = function getWatchStateManager (watcherTasks) {

    /**
     * Create a state obj for tracking which watcher tasks
     * are currently executing their tasks - this is to prevent
     * further triggers working whilst work is in process
     * @type {BehaviorSubject<T>}
     */
    const initialState = Object
        .keys(watcherTasks)
        .reduce((all, key) => {
            watcherTasks[key].watchers.forEach(item => {
                all[item.watcherUID] = {running: false};
            })
            return all;
        }, {});

    /**
     * Track state changes with BehaviorSubject + Observer
     * @type {BehaviorSubject}
     */
    const state  = new Rx.BehaviorSubject(initialState);
    const state$ = state.share();
    const start$ = new Rx.Subject();
    const stop$  = new Rx.Subject();

    const start = (watcherUID) => {
        return (state) => {
            state[watcherUID].running = true;
            return state;
        }
    };

    const stop = (watcherUID) => {
        return (state) => {
            state[watcherUID].running = false;
            return state;
        }
    };

    /**
     * Manage the state of all watchers.
     * Pull the event.watcherUID from each item
     */
    Rx.Observable.merge(start$.map(start), stop$.map(stop))
        .scan((all, item) => item(all), initialState)
        .subscribe(state);

    return {state, state$, start$, stop$};
}
