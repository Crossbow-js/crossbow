/// <reference path="../typings/main.d.ts" />
import {isPlainObject} from './task.utils';
const merge = require('../lodash.custom').merge;
const blacklist = ['options', 'bs-config', 'before'];

var watcherUID = 1;

import {WatchOptions} from "chokidar";
import {preprocessWatchTask} from "./watch.preprocess";
import {WatchTaskError, gatherWatchTaskErrors} from "./watch.errors";
import {CrossbowInput} from "./index";
import {Tasks} from "./task.resolve.d";
import {SequenceItem} from "./task.sequence.factories";
import {Runner} from "./runner";
import {CommandTrigger} from "./command.run";
import {TaskCollection} from "./task.resolve";

export const reservedTaskNames = ['before', 'options', 'bs-config'];
export const defaultWatchOptions = <CBWatchOptions>{
    ignoreInitial: true,
    block: false,
    throttle: 0,
    delay: 0,
    debounce: 0
};

export interface CBWatchOptions extends WatchOptions {
    throttle: number
    debounce: number
    delay: number
    block: boolean
}

export interface WatchTask {
    before: string[]
    options: CBWatchOptions
    watchers: Watcher[]
    name: string
    errors: WatchTaskError[]
}

export interface Watcher {
    patterns: string[]
    tasks: TaskCollection
    options: any
    watcherUID: any
    _tasks?: Tasks
    _sequence?: SequenceItem[]
    _runner?: Runner
    parent?: string
}

export interface WatchTasks {
    valid: WatchTask[]
    invalid: WatchTask[],
    all: WatchTask[]
}

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
function createOne(item, itemOptions, globalOptions): Watcher {
    if (isPlainObject(item)) {
        if (item.patterns && item.tasks) {
            return {
                patterns: [].concat(item.patterns).reduce((a, x) => a.concat(x.split(':')), []),
                tasks: [].concat(item.tasks),
                options: merge({}, defaultWatchOptions, globalOptions, itemOptions),
                watcherUID: watcherUID++
            };
        }
        // todo: Add error handling for incorrect watcher formats ie: user syntax error
    }
    return item;
}

/**
 * @param watchTaskParent
 * @param globalOptions
 * @returns {*}
 */
function getFormattedTask(watchTaskParent: WatchTask, globalOptions: CBWatchOptions): Watcher[] {
    /**
     * Look at each key provided to decide if it can
     * be transformed into a watcher obj
     */
    return Object.keys(watchTaskParent)
        /**
         * Exclude black listed keys that cannot be watcher
         * names such as `options` or `before`
         */
        .filter(x => blacklist.indexOf(x) === -1)
        .reduce((all: Watcher[], item: string) => {
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
                if (Array.isArray(watchTaskParent.watchers)) {
                    return all.concat(
                        watchTaskParent.watchers.map(watcher => {
                            return createOne(watcher, watchTaskParent.options, globalOptions);
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
                if (isPlainObject(watchTaskParent.watchers)) {
                    return Object.keys(watchTaskParent.watchers)
                        .map(key => createOne({
                            patterns: key,
                            tasks: watchTaskParent.watchers[key]
                        }, watchTaskParent.options, globalOptions));
                }
            }

            /**
             * At this point assume that the short-hard pattern <pattern>:<tasks>
             *  eg:
             *      "*.js": ['uglify']
             */
            return all.concat(createOne({
                patterns: item,        // key as the pattern
                tasks: watchTaskParent[item] // value as the tasks array
            }, watchTaskParent.options, globalOptions));
        }, []);
}

function createFlattenedWatchTask(taskName: string, trigger: CommandTrigger): WatchTask {

    const incoming = preprocessWatchTask(taskName);
    const selection = trigger.input.watch[incoming.taskName] || {};
    const watchers = getFormattedTask(selection, trigger.input.watch.options || {});

    const errors = gatherWatchTaskErrors(
        incoming,
        trigger.input
    );

    return {
        name: taskName,
        before: selection.before || [],
        options: selection.options || {},
        watchers: watchers,
        errors: errors
    }
}

function validateTask(task: WatchTask, trigger: CommandTrigger): boolean {
    return task.errors.length === 0;
}

export function resolveWatchTasks(taskNames: string[], trigger: CommandTrigger): WatchTasks {

    const taskList = taskNames
        .map(taskName => {
            return createFlattenedWatchTask(taskName, trigger);
        });

    /**
     * Return both valid & invalid tasks. We want to let consumers
     * handle errors/successes
     * @type {{valid: Array, invalid: Array}}
     */
    const output = {
        valid: taskList.filter(x => validateTask(x, trigger)),
        invalid: taskList.filter(x => !validateTask(x, trigger)),
        all: taskList
    };

    return output;
}

/**
 * The goal of this function is to produce a flat array containing tasks as strings
 * this allows us to feed that into the task resolution stuff
 */
export function resolveBeforeTasks(beforeFlagsFromCliOrConfig: string[], input: CrossbowInput, watchTasks: WatchTask[]): string[] {

    const fromTopLevelInput = [].concat(input.watch.before);
    const fromWatchTasks    = watchTasks.reduce((acc, item) => {
        return acc.concat(item.before);
    }, []);

    return [
        ...beforeFlagsFromCliOrConfig,
        ...fromTopLevelInput, // allow string or array for watch.before
        ...fromWatchTasks
    ].filter(Boolean);
}

