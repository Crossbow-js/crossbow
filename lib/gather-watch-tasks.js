var arrarifyObj = require('./utils').arrarifyObj;
var arrarify = require('./utils').arrarify;
var getKey = require('./utils').getKey;

/**
 * @param {Object} watch
 * @param {Array} filters
 * @returns {*}
 */
function filterTasks(watch, filters, predicate) {

    filters = arrarify(filters);
    predicate = predicate || function (arr, key) {
        return arr.indexOf(key) > -1;
    };

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

function stripBlacklisted(item) {
    var blacklist = ['options', 'bs-config', 'before'];
    return filterTasks(item, blacklist, function (arr, key) {
        return arr.indexOf(key) === -1;
    });
}

var getTaskFormat = function getTaskFormat(watchTask) {

    if (Array.isArray(watchTask)) {
        return watchTask.reduce(function (all, item) {
            return all.concat(getTaskFormat(item));
        }, []);
    }

    return Object.keys(watchTask).reduce(function (all, item) {
        return all.concat({
            patterns: arrarify(item),
            tasks: arrarify(watchTask[item])
        });
    }, []);
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

    var out = Object.keys(watchTasks).reduce(function (all, key) {
        all[key] = getTaskFormat(watchTasks[key]);
        return all;
    }, {});

    return out;

    //var watch = crossbow[key];
    //var tasks = [];
    //
    //if (filters && filters.length) {
    //    watch = filterTasks(watch, filters);
    //}
    //
    //watch = stripBlacklisted(watch);
    //
    //console.log(watch.tasks.default[0]);
    //console.log(watch.tasks.default[1]);
};