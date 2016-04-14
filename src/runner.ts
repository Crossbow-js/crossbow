import {SequenceItem} from "./task.sequence.factories";
import {RunCommandTrigger} from "./command.run";
import {Task} from "./task.resolve";
import {TaskReport} from "./task.runner";

import Rx = require('rx');

export interface Runner {
    series: (tracker$:any) => Rx.Observable<TaskReport>
    parallel: (tracker$:any) => Rx.Observable<TaskReport>,
    sequence: SequenceItem[]
}
