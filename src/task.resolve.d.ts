import {TaskError} from "./task.errors";
import {TaskOriginTypes, TaskTypes} from "./task.resolve";

export interface Task {
    valid: boolean
    taskName: string
    subTasks: string[]
    modules: string[]
    tasks: Task[]
    rawInput: string
    parents: string[]
    errors: TaskError[]
    adaptor?: string
    command?: string
    runMode: string
    startTime?: number
    endTime?: number
    duration?: number
    query: any
    origin: TaskOriginTypes
    type: TaskTypes
}

export interface TasknameWithOrigin {
    items: string[]
    origin: TaskOriginTypes
}

export interface Tasks {
    valid: Task[]
    invalid: Task[],
    all: Task[]
}