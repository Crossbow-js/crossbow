import {Tasks} from "./task.resolve";
import {SequenceItem} from "./task.sequence";
import {Runner} from "./runner";

export interface TaskRunner {
    tasks: Tasks
    sequence: SequenceItem[]
    runner: Runner
}
