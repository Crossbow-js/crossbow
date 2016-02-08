import {transformStrings} from "./task.utils";
const objPath = require('object-path');

import * as adaptors from "./adaptors";
import {Task} from "./task.resolve";
import {RunCommandTrigger} from "./command.run";
import {AdaptorTask} from "./task.resolve";

interface Observer {}

interface SequenceTask {
    FUNCTION: (obs: Observer, opts: any, ctx: RunCommandTrigger) => void
    completed: boolean
}

export interface SequenceItem {
    sequenceTasks: SequenceTask[]
    opts: any
    task: Task
}

export function createSequence (tasks: Task[], trigger: RunCommandTrigger): SequenceItem[] {

    return flatten([], tasks);

    function flatten(initial: any[], items: Task[]) {

        function reducer(all, item: Task);
        function reducer(all, item: AdaptorTask) {

            /**
             * If the current task has no related module,
             * but did have the adaptors flag, load the adaptors function for it
             */
            if (!item.modules.length && item.adaptor) {
                return all.concat(adaptorSequence(item, trigger));
            }

            /**
             * If the modules property is populated (ie: a JS file was found for it)
             * then load the module into memory and return
             */
            if (item.modules.length) {
                return all.concat(loadModules(item, trigger));
            }

            /**
             * if the current item also has tasks (children tasks)
             * then repeat this process to retrieve them also
             */
            if (item.tasks.length) {
                return flatten(all, item.tasks);
            }

            return all;
        }

        return items.reduce(reducer, initial);
    }
}

/**
 * Call the create method of the compatibility layer
 * to enable a fn that can be used in the pipeline
 * @param item
 * @param input
 * @param config
 * @returns {{fns: *[], opts: {}, task: *}}
 */
function adaptorSequence(item: AdaptorTask, trigger: RunCommandTrigger): SequenceItem {

    return {
        sequenceTasks: [
            {
                FUNCTION: adaptors[item.adaptor].create.apply(null, [item, trigger]),
                completed: false
            }
        ],
        opts: {},
        task: item
    };
}

/**
 * @param input
 * @param modules
 * @param item
 * @returns {*}
 */
function loadModules(task: Task, trigger: RunCommandTrigger): SequenceItem[] {

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

    /**
     * If no sub tasks exist, pass the config object relating to
     * this item
     */
    if (!task.subTasks.length) {
        return [{
            sequenceTasks: requireModule(task.modules[0]),
            opts: transformStrings(topLevelOpts, config),
            task: task
        }];
    }

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
    if (task.subTasks[0] === '*') {
        let keys = Object.keys(topLevelOpts);
        if (keys.length) {
            return keys.reduce((all, subTaskName) => {
                return all.concat({
                    sequenceTasks: requireModule(task.modules[0]),
                    opts: transformStrings(topLevelOpts[subTaskName], config),
                    task: task,
                    subTaskName: subTaskName
                });
            }, []);
        }
    }

    /**
     * Final case is when there ARE subTasks,
     * Add a new task for each item.
     */
    return task.subTasks.map(function (subTaskName) {
        let subTaskOptions = objPath.get(topLevelOpts, [subTaskName], {});
        return {
            sequenceTasks: requireModule(task.modules[0]),
            opts: transformStrings(subTaskOptions, config),
            task: task,
            subTaskName: subTaskName
        };
    });
}


/**
 * If the task resolves to a file on disk,
 * we pick out either the 'tasks' property
 * or the function export
 * @param {String} item
 * @returns {Object}
 */
function requireModule(taskName: string): SequenceTask[]  {

    const tasks = getTaskFunctions(require(taskName), taskName, []);

    return tasks.map(function (fn) {
        return {
            FUNCTION: fn,
            completed: false
        };
    });
}

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
