import {transformStrings} from "./task.utils";
const objPath = require('object-path');
const Rx = require('rx');

import * as adaptors from "./adaptors";
import {Task} from "./task.resolve";
import {RunCommandTrigger} from "./command.run";
import {Runner} from "./runner";
import Seq = Immutable.Seq;

interface Observer {}

export interface SequenceItem {
    type: string
    taskName?: string
    task?: Task
    items: SequenceItem[]
    factory: (obs: any, opts: any, ctx: RunCommandTrigger) => any
    startTime: number
    endTime: number
    duration: number
    completed: boolean
    opts: any
}

export function createFlattenedSequence (tasks: Task[], trigger: RunCommandTrigger): SequenceItem[] {
    return flatten(tasks, []);

    function flatten(items: Task[], initial: SequenceItem[]) {

        function reducer(all, task: Task) {
            /**
             * If the current task has child tasks, we build a tree of
             * nested observables for it (a task with children cannot itself
             * be a task that should be run)
             */
            if (task.tasks.length) {

                /**
                 * If the current task was marked as `parallel`, all immediate children
                 * of (this task) will be run in `parallel`
                 */
                if (task.runMode === 'parallel') {
                    return all.concat({
                        type: 'Parallel Group',
                        taskName: task.taskName,
                        items: flatten(task.tasks, [])
                    });
                }
                /**
                 * If the current task was marked as `series`, all immediate child tasks
                 * will be queued and run in series - each waiting until the previous
                 * one has completed
                 */
                if (task.runMode === 'series') {
                    return all.concat({
                        type: 'Series Group',
                        taskName: task.taskName,
                        items: flatten(task.tasks, []),
                    });
                }
            }

            /**
             * At this point, we must be dealing with a task that should be run,
             * so we first check if it's an adaptor @ task first
             */
            if (task.adaptor) {
                return all.concat({
                    type: 'Task',
                    task: task,
                    factory: adaptors[task.adaptor].create(task, trigger),
                    opts: {}
                });
            }

            /**
             * Finally, if the does not have children tasks & is not an
             * adaptor task it must have at least 1 associated module
             */
            if (task.modules.length) {
                if (task.subTasks.length) {
                    console.log('Has sub tasks', task.subTasks);
                }
                const imported = require(task.modules[0]);
                /**
                 * If the module did not export a function, but has a 'tasks'
                 * property that is an array, use each function from it
                 * eg:
                 *  module.exports.tasks [sass, cssmin, version-rev]
                 */
                if (imported.tasks && Array.isArray(imported.tasks)) {
                    return all.concat(imported.tasks.map(function (importedFn) {
                        return {
                            type: 'Task',
                            fnName: importedFn.name,
                            factory: importedFn,
                            task: task,
                            config: loadConfig(task, trigger)
                        }
                    }));
                }
                /**
                 * If the module exported a function, use that as the factory
                 * and return a single task for it.
                 * eg:
                 *  module.exports = function runSass() {}
                 */
                if (typeof imported === 'function') {
                    return all.concat({
                        type: 'Task',
                        fnName: imported.name,
                        factory: imported,
                        task: task,
                        config: loadConfig(task, trigger)
                    });
                }
            }
        }
        return items.reduce(reducer, initial);
    }
}

export function createRunner (items: SequenceItem[], trigger: RunCommandTrigger): Runner  {

    const flattened = flatten(items, []);

    return {
        series: () => {},
        parallel: () => {},
    };

    function flatten(items: SequenceItem[], initial: SequenceItem[]) {

        function reducer(all, item: SequenceItem) {

            /**
             * If the current task has child tasks, we build a tree of
             * nested observables for it (a task with children cannot itself
             * be a task that should be run)
             */
            /**
             * If the current task was marked as `parallel`, all immediate children
             * of (this task) will be run in `parallel`
             */
            if (item.type === 'Parallel Group') {

                return all.concat(Rx.Observable.merge(flatten(item.items, [])));
            }
            /**
             * If the current task was marked as `series`, all immediate child tasks
             * will be queued and run in series - each waiting until the previous
             * one has completed
             */
            if (item.type === 'Series Group') {
                return all.concat(Rx.Observable.concat(flatten(item.items, [])));
            }
            /**
             * Finally is item is a task, create an observable for it.
             */
            if (item.type === 'Task' && item.factory) {
                createObservableFromSequenceItem(item, trigger);
            }
        }

        return items.reduce(reducer, initial);
    }
}

function createObservableFromSequenceItem(item: SequenceItem, trigger: RunCommandTrigger) {

    return Rx.Observable.create(obs => {
            obs.done = function () {
                obs.onCompleted();
            };
            item.startTime = new Date().getTime();
            process.nextTick(function () {
                try {
                    item.factory(obs, item.opts, trigger);
                } catch (e) {
                    obs.onError(e);
                }
            });
            return () => {
                item.endTime   = new Date().getTime();
                item.duration  = item.endTime - item.startTime;
                item.completed = true;
            }
        })
        .catch(function (e) {
            console.log(e);
            return Rx.Observable.throw(e);
        })
        .share();
}

/**
 * @param input
 * @param modules
 * @param item
 * @returns {*}
 */
function loadConfig(task: Task, trigger: RunCommandTrigger): any {

    /**
     * First access top-level configuration
     */
    let config       = trigger.input.config;
    let lookup       = task.taskName;

    /**
     * Now access a child property related to this task.
     * eg:     $ sass:dev
     * config: sass:
     *           dev: "scss/core.scss"
     * -> dev: "scss/core.scss"
     *
     * or
     * config: sass:
     *           dev:
     *              input: "scss/core.scss"
     *           site:
     *              input: "scss/site.scss"
     * -> {dev: {input: "scss/core.scss"}, site: {input: "scss/site.scss"}}
     */
    let topLevelOpts = objPath.get(config, [lookup], {});

    return topLevelOpts;
    /**
    // * If no sub tasks exist, pass the config object relating to
    // * this item
    // */
    //if (!task.subTasks.length) {
    //
    //    const opts       = transformStrings(topLevelOpts, config);
    //    const moduleTask = getTaskFunctions(require(task.modules[0]), task.taskName, []);
    //    return moduleTask.map(fn => {
    //        return createObservableFromSequenceItem(task, trigger, opts, fn);
    //    });
    //}

    /**
     * If the subTasks[0] is a *
     * add a task for each key in the provided config
     * eg:
     *   tasks:
     *      css: ['sass:*', 'version-rev']
     *
     *   config:
     *      sass: {
     *          site: 'core.scss'
     *          dev:  'core.scss'
     *      }
     *
     * is exactly equivalent to running:
     *   -> ['sass:site', 'sass:dev']
     */
    //if (task.subTasks[0] === '*') {
    //    let keys = Object.keys(topLevelOpts);
    //    if (keys.length) {
    //        return keys.reduce((all, subTaskName) => {
    //            return all.concat({
    //                sequenceTasks: requireModule(task.modules[0]),
    //                opts: transformStrings(topLevelOpts[subTaskName], config),
    //                task: task,
    //                subTaskName: subTaskName
    //            });
    //        }, []);
    //    }
    //}
    //
    ///**
    // * Final case is when there ARE subTasks,
    // * Add a new task for each item.
    // */
    //return task.subTasks.map(function (subTaskName) {
    //    let subTaskOptions = objPath.get(topLevelOpts, [subTaskName], {});
    //    return {
    //        sequenceTasks: requireModule(task.modules[0]),
    //        opts: transformStrings(subTaskOptions, config),
    //        task: task,
    //        subTaskName: subTaskName
    //    };
    //});
}


/**
// * If the task resolves to a file on disk,
// * we pick out either the 'tasks' property
// * or the function export
// * @param {String} item
// * @returns {Object}
// */
//function requireModule(taskName: string): SequenceTask[]  {
//
//    const tasks = getTaskFunctions(require(taskName), taskName, []);
//
//    return tasks.map(function (fn) {
//        return {
//            FUNCTION: fn,
//            completed: false
//        };
//    });
//}

/**
 * Accept first an array of tasks as an export,
 * then look if a single function was exported and
 * use that instead
 * @param {Object} item
 * @param {String} taskName
 * @param {Array} previous
 * @returns {Array}
 */
function getTaskFunctions(item: any, taskName: string, previous) {

    if (typeof item === 'function') {
        return previous.concat(item);
    }

    const moduleTasks = item.tasks;

    if (Array.isArray(moduleTasks)) {
        return previous.concat(moduleTasks);
    }

    console.error('Module %s did not have a tasks array or function export', taskName);

    return previous;
}
