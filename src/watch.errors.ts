import {CrossbowInput} from "./index";
import {OutgoingWatchTask} from "./watch.preprocess";
const objPath = require('object-path');

export enum WatchTaskErrorTypes {
    NameNotFound
}

export interface WatchTaskError {}

export interface NameNotFound extends WatchTaskError { type: WatchTaskErrorTypes, taskName: string }

export function gatherWatchTaskErrors (outgoing: OutgoingWatchTask, input:CrossbowInput): WatchTaskError[] {
    return [
        getModuleErrors,
    ].reduce((all, fn) => all.concat(fn(outgoing, input)), []);
}

function getModuleErrors (outgoing: OutgoingWatchTask, input: CrossbowInput): WatchTaskError[] {
    if (!input.watch[outgoing.taskName]) {
        return [{type: WatchTaskErrorTypes.NameNotFound, name: outgoing.taskName}];
    }
    return [];
}