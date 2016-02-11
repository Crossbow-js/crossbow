import {SequenceItem} from "./task.sequence";
import {RunCommandTrigger} from "./command.run";
import {Task} from "./task.resolve";
import {AdaptorTask} from "./task.resolve";

interface Observable {}

interface Runner {
    series: () => any
    parallel: () => any
}

export function createRunner (tasks: AdaptorTask[], sequence: SequenceItem[], ctx: RunCommandTrigger): Runner;
export function createRunner (tasks: Task[], sequence: SequenceItem[], ctx: RunCommandTrigger): Runner {
    return {
        series: () => {},
        parallel: () => {}
    }
}