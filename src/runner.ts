import {SequenceItem} from "./task.sequence.factories";
import {TaskReport} from "./task.runner";

import Rx = require('rx');

export interface Runner {
    series: () => Rx.Observable<TaskReport>
    parallel: () => Rx.Observable<TaskReport>,
    sequence: SequenceItem[]
}
