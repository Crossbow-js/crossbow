import {RunCommandTrigger} from "./command.run";
import {TaskError} from "./task.errors";
import {Task} from "./task.resolve";
import {WatchTask} from "./watch.resolve";

export interface OutgoingWatchTask {
    rawInput: string,
    taskName: string,
    patterns: string[],
    tasks: string[]
}

export function preprocessWatchTask(taskName: string): OutgoingWatchTask {

    return {
        taskName: taskName,
        rawInput: taskName,
        patterns: [],
        tasks: []
    }
}
