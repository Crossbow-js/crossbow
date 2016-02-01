const Rx       = require('rx');
const chokidar = require('chokidar');
const debug    = require('debug')('cb:watcher');
var watcherUID = 0;

function getWatchers(items) {

    const watchers = Object
        .keys(items)
        .reduce((all, key) => {
            return all.concat(
                items[key].watchers.map(x => watcherAsObservable(x, key, watcherUID++))
            );
        }, []);

    return Rx.Observable
        .merge(watchers)
        .share();
}

module.exports.getWatchers = getWatchers;

/**
 * @param {Object} item
 * @param {String} namespace
 * @param {Number} watcherUID
 * @returns {Observable}
 */
function watcherAsObservable (item, namespace, watcherUID) {
    return Rx.Observable.create(obs => {
        debug(`+ [id:${watcherUID}] ${item.patterns.length} patterns (${item.patterns})`);
        debug(`  - ${item.tasks.length} tasks (${item.tasks})`);
        const watcher = chokidar.watch(item.patterns, item.options)
            .on('all', function (event, file) {
                obs.onNext({
                    namespace,
                    event: event,
                    path:  file,
                    item:  item,
                    tasks: item.tasks,
                    watcherUID:   watcherUID,
                });
            });
        watcher.on('ready', () => debug(`√ [${watcherUID}] watcher ready (${item.patterns})`))
        return () => {
            debug(`- for ${item.patterns}`);
            watcher.close();
        }
    });
}

