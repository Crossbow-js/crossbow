var arrarifyObj = require('./utils').arrarifyObj;
var arrarify    = require('./utils').arrarify;
var getKey      = require('./utils').getKey;

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
        throw new TypeError('Could not locate individual watch tasks: ', filter);
    }

    return keys.reduce(function (obj, key) {
        if (predicate(filters, key)) {
            obj[key] = watch[key];
        }
        return obj;
    }, {});
}

function stripBlacklisted (item) {
    var blacklist = ['options', 'bs-config', 'before'];
    return filterTasks(item, blacklist, function (arr, key) {
        return arr.indexOf(key) === -1;
    });
}

/**
 * Gather tasks and flatten config
 * @param {Object} crossbow
 * @param {String|Array} filters
 * @returns {Array}
 */
module.exports = function (crossbow, filters) {

    var watch = crossbow.watch;
    var tasks = [];

    if (filters && filters.length) {
        watch = filterTasks(watch, filters);
    }

    watch = stripBlacklisted(watch);

    /**
     * Look for top level (non-namespaced) watchers
     */
    if (watch.tasks) {
        /**
         * If an array is given process each.
         * eg: watch: { tasks: [task1, task2] }
         */
        if (Array.isArray(watch.tasks)) {
            watch.tasks.forEach(createTask);
        } else {
            /**
             * If an Object given, wrap in array and process the same
             * eg: watch: { tasks: { '*.js': 'babel' } }
             */
            if (Object.keys(watch.tasks).length > 0) {
                [watch.tasks].forEach(createTask);
            }
        }
    } else {
        if (Array.isArray(watch)) {
            watch.forEach(createTask);
        } else {
            /**
             * Namespaced watchers
             */
            Object.keys(watch).forEach(function (key) {
                var item = watch[key];
                if (Array.isArray(item.tasks)) {
                    item.tasks.forEach(createTask);
                } else {
                    item.forEach(createTask);
                }
            });
        }
    }

    /**
     * @param obj
     */
    function createTask(obj) {

        if (obj.patterns && obj.tasks) { // patterns obj
            tasks.push(arrarifyObj(obj));
        } else { // patterns as keys
            Object.keys(obj).forEach(function (key) {
                var item = obj[key];
                tasks.push(arrarifyObj({
                    patterns: getKey(key, crossbow),
                    tasks:    item
                }));
            });
        }
    }

    return tasks;
};