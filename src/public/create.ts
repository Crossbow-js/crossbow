import {CommandTrigger} from "../command.run";
const merge = require('lodash.merge');

type returnFn = (opts: {}, trigger: CommandTrigger) => any;

let fncount = 0;

function incomingTask (taskname: string, fn: returnFn): {}
function incomingTask (taskname: string, deps: string[], fn?: returnFn): {}
function incomingTask (taskname: string, deps?, fn?): {} {

    if (typeof deps === 'function') {
        fn = deps;
        deps = [];
    }

    const outgoing = {};

    if (deps.length) {
        if (!fn) {
            outgoing[taskname] = deps;
        } else {
            const fnname = `_internal_fn_${fncount}_${taskname}`;
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
    options: {}
};

function incomingOptions (taskname: string, hash?:any): {} {
    const outgoing = {};
    if (typeof taskname === 'string') {
        outgoing[taskname] = hash;
        return outgoing;
    }
    return taskname;
}

export function create () {
    const api = {
        input: input,
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
        options: function (incoming: {}) {
            const res = incomingOptions.apply(null, arguments);
            input.options = merge(input.options, res);
        }
    };
    return api;
}

export default input;