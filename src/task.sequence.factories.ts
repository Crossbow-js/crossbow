import {transformStrings} from "./task.utils";
const assign = require('object-assign');

import * as adaptors from "./adaptors";
import {Task} from "./task.resolve";
import {RunCommandTrigger} from "./command.run";
import {Runner} from "./runner";
import Seq = Immutable.Seq;

export interface SequenceItem {
    type: string
    taskName?: string
    task?: Task
    items: SequenceItem[]
    factory?: (obs: any, opts: any, ctx: RunCommandTrigger) => any
    startTime?: number
    endTime?: number
    duration?: number
    completed?: boolean
    opts?: any
    fnName?: string
    config?: any
}

export interface SequenceSeriesGroup {
    taskName: string
    items: any[]
}

export interface SequenceParallelGroup extends SequenceSeriesGroup {}

export interface SequenceTask {
    fnName: string,
    factory: TaskFactory,
    task: Task,
    config: any
}

export interface TaskFactory {
    (task: Task, trigger: RunCommandTrigger): any
    tasks?: TaskFactory[]
    name?: string
}

export function createSequenceTaskItem(incoming: SequenceTask): SequenceItem {
    return assign({type: 'Task', items: []}, incoming);
}

export function createSequenceSeriesGroup(incoming: SequenceSeriesGroup): SequenceItem {
    return assign({type: 'Series Group'}, incoming);
}

export function createSequenceParallelGroup(incoming: SequenceParallelGroup): SequenceItem {
    return assign({type: 'Parallel Group'}, incoming);
}
