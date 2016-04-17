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
