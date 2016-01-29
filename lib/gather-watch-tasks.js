const isPlainObj = require('./utils').plainObj;
const blacklist  = ['options', 'bs-config', 'before'];
const merge  = require('lodash.merge');

const defaultWatchOptions = {
    ignoreInitial: true
};

/**
 * Create a single watch task item consisting of
 *  - patterns
 *  - tasks
 *  - options
 * @param {object} item
 * @param {object} itemOptions
 * @param {object} globalOptions
 * @returns {*}
 */
function createOne (item, itemOptions, globalOptions) {
    if (isPlainObj(item)) {
        if (item.patterns && item.tasks) {
            return {
                patterns: [].concat(item.patterns).reduce((a, x) => a.concat(x.split(':')), []),
                tasks:    [].concat(item.tasks),
                options: merge({}, defaultWatchOptions, globalOptions, itemOptions)
            };
        }
        // todo: Add error handling for incorrect formats ie: user error
    }
    return item;
}

/**
 * @param watchTask
 * @param globalOptions
 * @returns {*}
 */
function getFormattedTask (watchTask, globalOptions) {

    /**
     * Look at each key provided to decide if it can
     * be transformed into a watcher obj
     */
    return Object.keys(watchTask)
        /**
         * Exclude black listed keys that cannot be watcher
         * names such as `options` or `before`
         */
        .filter(x => blacklist.indexOf(x) === -1)
        .reduce((all, item) => {
            /**
             * Here we assume the long-hand version is being
             * used where the watchers property is provided.
             * If it is, that means we can create a watcher
             * object for each item in the 'watchers' array
             * eg:
             *
             * default:
             *   options:
             *     exclude: '*.html'
             *   before: ['bs']
             *   watchers:
             *     - patterns: ['test/fixtures']
             *       tasks:    ['1', '2']
             *     - patterns: ['*.css']
             *       tasks:    '3'
             */
            if (item === 'watchers' && Array.isArray(watchTask['watchers'])) {
                return all.concat(
                    watchTask.watchers.map(watcher => {
                        return createOne(watcher, watchTask.options, globalOptions);
                    })
                );
            }

            /**
             * At this point assume that the short-hard pattern <pattern>:<tasks>
             *  eg:
             *      "*.js": ['uglify']
             */
            return all.concat(createOne({
                patterns: item,        // key as the pattern
                tasks: watchTask[item] // value as the tasks array
            }, watchTask.options, globalOptions));
        }, []);
};

/**
 * Gather tasks and flatten config
 * @returns {Array}
 * @param input
 */
module.exports = function (input) {

    const watch      = input.watch;
    const tasks      = watch.tasks || {};
    const globalOpts = watch.options || {};

    return Object.keys(tasks)
        .reduce((all, key) => {
            all[key]          = {};
            all[key].before   = tasks[key].before || [];
            all[key].options  = tasks[key].options || {};
            all[key].watchers = getFormattedTask(tasks[key], globalOpts);
            return all;
        }, {});
};
