import {SequenceItem} from "./task.sequence.factories";
import {RunCommandTrigger} from "./command.run";
import {Task} from "./task.resolve";

interface Observable {}

export interface Runner {
    series: (tracker$:any) => any
    parallel: (tracker$:any) => any,
    sequence: SequenceItem[]
}
