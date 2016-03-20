import {SequenceItem} from "./task.sequence.factories";
import {RunCommandTrigger} from "./command.run";
import {Task} from "./task.resolve";

interface Observable {}

export interface Runner {
    series: () => any
    parallel: () => any,
    sequence: SequenceItem[]
}
