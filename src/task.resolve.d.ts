import {TaskError} from "./task.errors.d";
import {ExternalTask} from "./task.utils";

import {
    TaskOriginTypes,
    TaskTypes,
    TaskRunModes,
    CBFunction
} from "./task.resolve";

export interface Task {
    adaptor?: string
    command?: string
    valid: boolean
    taskName: string
    baseTaskName: string
    subTasks: string[]
    externalTasks: ExternalTask[]
    tasks: Task[]
    rawInput: string
    parents: string[]
    errors: TaskError[]
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
    description: string
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
