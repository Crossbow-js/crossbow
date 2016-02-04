/// <reference path="../typings/main.d.ts" />

const isPlainObj = require('./utils').plainObj;
const blacklist  = ['options', 'bs-config', 'before'];
const merge      = require('lodash.merge');


var watcherUID = 1;

interface WatchOptions {
    ignoreInitial: boolean
}

interface WatchTask {
    patterns: string[]
    tasks: string[]
    options: any
    watcherUID: any
}

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
function createOne (item, itemOptions, globalOptions) : WatchTask {
    if (isPlainObj(item)) {
        if (item.patterns && item.tasks) {
            return {
                patterns:   [].concat(item.patterns).reduce((a, x) => a.concat(x.split(':')), []),
                tasks:      [].concat(item.tasks),
                options:    merge({}, defaultWatchOptions, globalOptions, itemOptions),
                watcherUID: watcherUID++
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
function getFormattedTask (watchTask, globalOptions) : WatchTask[] {

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
            if (item === 'watchers') {

                /**
                 * If the `watcher` property is an Array, it must
                 * be an Array of Objects, so process each one individually.
                 * eg:
                 *  default:
                 *      watchers: [
                 *          {
                 *              patterns: ["scss/**", "css/*.scss"],
                 *              tasks:    ["$npm node-sass"],
                 *          }
                 *      ]
                 */
                if (Array.isArray(watchTask.watchers)) {
                    return all.concat(
                        watchTask.watchers.map(watcher => {
                            return createOne(watcher, watchTask.options, globalOptions);
                        })
                    );
                }

                /**
                 * If the `watchers` property is a plain object,
                 * use it's keys as watch patterns and the values as
                 * tasks.
                 * eg:
                 *  default:
                 *      watchers: {
                 *          "*.js":   ["$npm eslint"],
                 *          "*.scss": ["$npm node-sass"]
                 *      }
                 */
                if (isPlainObj(watchTask.watchers)) {
                    return Object.keys(watchTask.watchers)
                        .map(key => createOne({
                            patterns: key,
                            tasks: watchTask.watchers[key]
                        }, watchTask.options, globalOptions));
                }
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
}

/**
 * Gather tasks and flatten config
 * @returns {Array}
 * @param input
 */
interface WatchTaskParent {
    before: string[]
    options: WatchOptions
    watchers: WatchTask[]
}

function getWatchTaskParent(item: any, globalOpts: any) : WatchTaskParent {
    return {
        before: item.before   || [],
        options: item.options || {},
        watchers: getFormattedTask(item, globalOpts)
    }
}

module.exports = function getWatchTasks (input)  {

    const watch      = input.watch;
    const tasks      = watch.tasks || {};
    const globalOpts = watch.options || {};

    return Object.keys(tasks)
        .reduce((all, key) => {
            all[key] = getWatchTaskParent(tasks[key], globalOpts);
            return all;
        }, {});
};
