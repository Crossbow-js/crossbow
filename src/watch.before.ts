import {Meow} from "./index";
import {WatchTrigger} from "./command.watch";
import {WatchTasks, resolveBeforeTasks} from "./watch.resolve";
import {resolveTasks, Tasks} from "./task.resolve";
import * as seq from "./task.sequence";
import {SequenceItem} from "./task.sequence.factories";
const debug = require("debug");
import Rx = require("rx");

export interface BeforeTasks {
    runner: any
    beforeTasksAsCliInput: string[]
    tasks: Tasks
    sequence: SequenceItem[]
}

export function getBeforeTaskRunner (cli: Meow,
                                     trigger: WatchTrigger,
                                     watchTasks: WatchTasks,
                                     tracker$: Rx.Observable<any>): BeforeTasks {
    /**
     * Get 'before' task list
     */
    const beforeTasksAsCliInput = resolveBeforeTasks(trigger.input, watchTasks.valid);

    debug(`Combined global + task specific 'before' tasks [${beforeTasksAsCliInput}]`);

    /**
     * Now Resolve the before task names given in input.
     */
    const beforeTasks = resolveTasks(beforeTasksAsCliInput, trigger);

    const beforeSequence = seq.createFlattenedSequence(beforeTasks.valid, trigger);
    const beforeRunner   = seq.createRunner(beforeSequence, trigger);

    return {
        tasks: beforeTasks,
        sequence: beforeSequence,
        runner: beforeRunner,
        beforeTasksAsCliInput
    };
}