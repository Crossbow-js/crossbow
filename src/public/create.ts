import {CommandTrigger} from "../command.run";

type returnFn = (opts: {}, trigger: CommandTrigger) => any;

function incomingTask (taskname: string, fn: returnFn): void
function incomingTask (taskname: string, deps: string[], fn?: returnFn): void
function incomingTask (taskname: string, deps?, fn?): void {
    if (typeof deps === 'function') {
        fn = deps;
    }
    console.log('deps', deps);
    console.log('fn', fn);
}

export function create () {
    return {
        task: incomingTask
    }
}