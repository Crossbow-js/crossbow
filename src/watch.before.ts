import {CLI} from "./index";
import {WatchTasks, resolveBeforeTasks} from "./watch.resolve";
import {resolveTasks} from "./task.resolve";
import {Tasks} from "./task.resolve.d";
import * as seq from "./task.sequence";
import {SequenceItem} from "./task.sequence.factories";
const debug = require("debug");
import Rx = require("rx");
import {CommandTrigger} from "./command.run";

export interface BeforeTasks {
    runner: any
    beforeTasksAsCliInput: string[]
    tasks: Tasks
    sequence: SequenceItem[]
}

export function getBeforeTaskRunner(cli: CLI,
                                    trigger: CommandTrigger,
                                    watchTasks: WatchTasks): BeforeTasks {
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
    const beforeRunner = seq.createRunner(beforeSequence, trigger);

    return {
        tasks: beforeTasks,
        sequence: beforeSequence,
        runner: beforeRunner,
        beforeTasksAsCliInput
    };
}
