import {CommandTrigger} from "../command.run";
import {CBWatchOptions} from "../watch.resolve";
import {CrossbowConfiguration} from "../config";
// todo why are these imports needed here?
import watchCommand, {WatchCommandOutput, WatchReport} from '../command.watch';
import {CLI} from "../index";
import {isPlainObject} from "../task.utils";
import IDisposable = Rx.IDisposable;
const merge = require('../../lodash.custom').merge;

type returnFn = (opts: {}, trigger: CommandTrigger) => any;

let fncount            = 0;
let inlineWatcherCount = 0;

function incomingTask (taskname: string, inlineLiteral: {}): {}
function incomingTask (taskname: string, inlineLiteral: {}, fn?: returnFn): {}
function incomingTask (taskname: string, fn: returnFn): {}
function incomingTask (taskname: string, deps: string[], fn?: returnFn): {}
function incomingTask (taskname: string, deps: any, fn?:any): any {

    // only 2 params given (function last);
    if (typeof deps === 'function') {
        fn = deps;
        deps = [];
    }

    const outgoing = {};

    if (isPlainObject(deps) && deps.tasks) {
        if (deps.tasks) {
            outgoing[taskname] = deps;
        } else {
            throw new Error('Object literal must contain at least a "tasks" key');
        }
        if (fn) {
            const fnname = `${taskname}_internal_fn_${fncount++}`;
            outgoing[fnname] = fn;
            outgoing[taskname].tasks.push(fn);
        }
        return outgoing;
    }

    deps = [].concat(deps).filter(Boolean);

    if (deps.length) {
        if (!fn) {
            outgoing[taskname] = deps;
        } else {
            const fnname = `${taskname}_internal_fn_${fncount}`;
            outgoing[fnname] = fn;
            outgoing[taskname] = deps.concat(fnname);
        }
    } else {
        if (fn) {
            outgoing[taskname] = fn;
        }
    }
    return outgoing;
}

var input = {
    tasks: {},
    watch: {},
    options: {},
    env: {},
    config: <CrossbowConfiguration>{}, // to be set by lib
    cli: <CLI>{}, // to be set by lib
    reporter: ()=>{} // to be set by lib
};

function incomingOptions (taskname: string, hash?:any): {} {
    const outgoing = {};
    if (typeof taskname === 'string') {
        outgoing[taskname] = hash;
        return outgoing;
    }
    return taskname;
}

export const api = {
    input: input,
    env: function (obj: any) {
        input.env = merge(input.env, obj);
    },
    config: function (obj: any) {
        input.config = merge(input.config, obj);
    },
    task: function (taskname: string) {
        const res = incomingTask.apply(null, arguments);
        input.tasks = merge(input.tasks, res);
        return {
            options: function (hash: any) {
                const res = incomingOptions(taskname, hash);
                input.options = merge(input.options, res);
            }
        }
    },
    group: function (groupName: string, tasks: {}) {
        input.tasks[`(${groupName})`] = tasks;
    },
    options: function (incoming: {}) {
        const res = incomingOptions.apply(null, arguments);
        input.options = merge(input.options, res);
    },
    watch: function (patterns: string[], tasks: string[], options?: CBWatchOptions): IDisposable {
        const watcher = getWatcher(patterns, tasks, options);
        const sub = watcher.flatMap(function (watchCommand: WatchCommandOutput) {
            return watchCommand.update$;
        });
        return sub.subscribe();
    },
    watcher: function (patterns: string[], tasks: string[], options?: CBWatchOptions): Rx.Observable<WatchReport> {
        const watcher = getWatcher(patterns, tasks, options);
        return watcher.flatMap((watchCommand: WatchCommandOutput) => {
            return watchCommand.update$;
        });
    }
};

function getWatcher (patterns: string[], tasks: string[], options?: CBWatchOptions) {
    const identifer = `_inline_watcher_${inlineWatcherCount++}`;
    patterns = [].concat(patterns);
    tasks    = [].concat(tasks);

    input.watch[identifer] = {
        options: options,
        watchers: [
            {
                patterns: patterns,
                tasks: tasks
            }
        ]
    };

    const cliInput = ['watch', identifer];
    return watchCommand({input: cliInput, flags:{}}, input, input.config, input.reporter);
}

export default input;
