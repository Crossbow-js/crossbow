var arrarifyObj = require('./utils').arrarifyObj;
var arrarify    = require('./utils').arrarify;
var getKey      = require('./utils').getKey;
var blacklist = ['options', 'bs-config', 'before'];

/**
 * @param {Object} watch
 * @param {Array} filters
 * @returns {*}
 */
function filterTasks (watch, filters, predicate) {

    filters = arrarify(filters);
    predicate = predicate || function (arr, key) { return arr.indexOf(key) > -1 };

    var keys = Object.keys(watch);

    if (!keys.length) {
        throw new TypeError('Could not locate individual properties: ' + filters);
    }

    var out = keys.reduce(function (obj, key) {
        if (predicate(filters, key)) {
            obj[key] = watch[key];
        }
        return obj;
    }, {});

    return out;
}

function stripBlacklisted (item) {
    return filterTasks(item, blacklist, function (arr, key) {
        return arr.indexOf(key) === -1;
    });
}

var getTaskFormat = function (watchTask) {

    if (Array.isArray(watchTask)) {
        return watchTask.reduce((all, item) => {
            return all.concat(getTaskFormat(item));
        }, []);
    }

    return Object.keys(watchTask).reduce((all, item) => {
        if (blacklist.indexOf(item) > -1) {
            all.before = all.before.concat(watchTask[item]);
        } else {
            all.items = all.items.concat({
                patterns: item.split(':'),
                tasks: arrarify(watchTask[item])
            });
        }
        return all;
    }, {before: [], items: []});
};

/**
 * Gather tasks and flatten config
 * @param {Object} crossbow
 * @param {String|Array} filters
 * @returns {Array}
 */
module.exports = function (input) {

    var watch = input.watch;
    var watchTasks = watch.tasks;

    var out = Object.keys(watchTasks).reduce((all, key )=> {
        all[key] = getTaskFormat(watchTasks[key]);
        return all;
    }, {});

    return out;
};