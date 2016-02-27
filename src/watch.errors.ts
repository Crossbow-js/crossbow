import {CrossbowInput} from "./index";
import {OutgoingWatchTask} from "./watch.preprocess";

export enum WatchTaskErrorTypes {
    NameNotFound
}

export interface WatchTaskError {
    type: WatchTaskErrorTypes
}
export interface NameNotFoundError extends WatchTaskError { taskName: string }

export function gatherWatchTaskErrors (outgoing: OutgoingWatchTask, input:CrossbowInput): WatchTaskError[] {
    return [
        getModuleErrors,
    ].reduce((all, fn) => all.concat(fn(outgoing, input)), []);
}

function getModuleErrors (outgoing: OutgoingWatchTask, input: CrossbowInput): WatchTaskError[] {
    if (!input.watch[outgoing.taskName]) {
        return [<NameNotFoundError>{type: WatchTaskErrorTypes.NameNotFound, taskName: outgoing.taskName}];
    }
    return [];
}
