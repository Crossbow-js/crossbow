const Rx       = require('rx');
const chokidar = require('chokidar');
const logger = require('./logger');
const debug    = require('debug')('cb:watcher');

function getWatchers(items) {

    const watchers = Object
        .keys(items)
        .reduce((all, key) => {
            return all.concat(
                items[key].watchers.map(x => watcherAsObservable(x, key))
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
function watcherAsObservable (item, namespace) {
    return Rx.Observable.create(obs => {
        debug(`+ [id:${item.watcherUID}] ${item.patterns.length} patterns (${item.patterns})`);
        debug(`  - ${item.tasks.length} tasks (${item.tasks})`);
        const watcher = chokidar.watch(item.patterns, item.options)
            .on('all', function (event, file) {
                obs.onNext({
                    namespace,
                    event: event,
                    path:  file,
                    item:  item,
                    tasks: item.tasks,
                    watcherUID: item.watcherUID
                });
            });
        watcher.on('ready', () => {
            debug(`√ [id:${item.watcherUID}] watcher ready (${item.patterns})`);
            if (Object.keys(watcher.getWatched()).length === 0) {
                logger.error('{red:x warning} `{cyan:%s}` did not match any files', item.patterns.toString());
            }
        });
        return () => {
            debug(`- for ${item.patterns}`);
            watcher.close();
        }
    });
}

