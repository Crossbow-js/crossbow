var Rx = require('rx');

function getWatchers(items) {
    var files = items.map(watcherAsObservable);
    return Rx.Observable
        .merge(files)
        .publish()
        .refCount();
}

module.exports.getWatchers = getWatchers;

/**
 * @param {Object} item
 * @returns {Observable}
 */
function watcherAsObservable (item) {
    return Rx.Observable.create(function (obs) {
        //console.log('createing for', item.patterns);
        var watcher = require('chokidar')
            .watch(item.patterns)
            .on('all', function (event, file) {
                obs.onNext({
                    event: event,
                    path: file,
                    item: item,
                    tasks: item.tasks
                });
            });
    }).map(x => x);
}

