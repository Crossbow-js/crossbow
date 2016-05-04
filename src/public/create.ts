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

export function create () {
    return {
        input: input,
        task: function () {
        	const res = incomingTask.apply(null, arguments);
            input.tasks = merge(input.tasks, res);
        },
        options: function (incoming: {}) {
            input.options = merge(input.options, incoming);
        }
    }
}

export default input;