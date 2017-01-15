import {CrossbowInput} from "./index";
import {OutgoingWatchTask} from "./watch.preprocess";

export enum WatchTaskErrorTypes {
    WatchTaskNameNotFound = <any>"WatchTaskNameNotFound"
}

export interface WatchTaskError {
    type: WatchTaskErrorTypes;
}
export interface WatchTaskNameNotFoundError extends WatchTaskError { taskName: string;
}

export function gatherWatchTaskErrors(outgoing: OutgoingWatchTask, input: CrossbowInput): WatchTaskError[] {
    return [
        getModuleErrors,
    ].reduce((all, fn) => all.concat(fn(outgoing, input)), []);
}

function getModuleErrors(outgoing: OutgoingWatchTask, input: CrossbowInput): WatchTaskError[] {
    if (!input.watch[outgoing.taskName]) {
        return [<WatchTaskNameNotFoundError>{
            type: WatchTaskErrorTypes.WatchTaskNameNotFound,
            taskName: outgoing.taskName
        }];
    }
    return [];
}
