import {SequenceItem} from "./task.sequence.factories";
import {TaskReport} from "./task.runner";

import Rx = require('rx');

export interface Runner {
    series: (tracker$: Rx.Observable<any>) => Rx.Observable<TaskReport>
    parallel: (tracker$: Rx.Observable<any>) => Rx.Observable<TaskReport>,
    sequence: SequenceItem[]
}
