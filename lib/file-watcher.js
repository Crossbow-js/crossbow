var Rx = require('rx');

function getWatchers(items) {
    return Rx.Observable
        .merge(items.map(watcherAsObservable))
        .publish()
        .refCount();
}

module.exports.getWatchers = getWatchers;

/**
 * @param {Object} item
 * @returns {Observable}
 */
function watcherAsObservable (item) {
    var obs = new Rx.Subject();
    require('chokidar')
        .watch(item.patterns, item.options)
        .on('all', function (event, file) {
            obs.onNext({
                event: event,
                path: file,
                item: item,
                tasks: item.tasks
            });
        });
    return obs;
}

