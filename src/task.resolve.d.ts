import {TaskError} from "./task.errors.d";
import {TaskOriginTypes, TaskTypes, TaskRunModes, CBFunction} from "./task.resolve";

export interface Task {
    valid: boolean
    taskName: string
    baseTaskName: string
    subTasks: string[]
    modules: string[]
    tasks: Task[]
    rawInput: string
    parents: string[]
    errors: TaskError[]
    adaptor?: string
    command?: string
    runMode: TaskRunModes
    startTime?: number
    endTime?: number
    duration?: number
    query: any
    flags: any
    cbflags: string[]
    origin: TaskOriginTypes
    type: TaskTypes
    inlineFunctions: Array<CBFunction>
    env: any
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
