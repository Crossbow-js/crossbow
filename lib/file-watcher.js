const Rx       = require('rx');
const chokidar = require('chokidar');
const debug    = require('debug')('cb:watcher');
var uid = 0;

function getWatchers(items) {

    const watchers = Object
        .keys(items)
        .reduce((all, key) => {
            return all.concat(
                items[key].watchers.map(x => watcherAsObservable(x, key, uid++))
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
 * @param {Number} uid
 * @returns {Observable}
 */
function watcherAsObservable (item, namespace, uid) {
    return Rx.Observable.create(obs => {
        debug(`+ [${uid}] ${item.patterns.length} patterns (${item.patterns})`);
        debug(`  - ${item.tasks.length} tasks (${item.tasks})`);
        const watcher = chokidar.watch(item.patterns, item.options)
            .on('all', function (event, file) {
                obs.onNext({
                    namespace,
                    event: event,
                    path:  file,
                    item:  item,
                    tasks: item.tasks,
                    uid:   uid,
                });
            });
        watcher.on('ready', () => debug(`√ [${uid}] watcher ready (${item.patterns})`))
        return () => {
            debug(`- for ${item.patterns}`);
            watcher.close();
        }
    });
}

