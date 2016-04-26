const Rx = require('rx');

import {Tasks} from "./task.resolve.d";
import {SequenceItem} from "./task.sequence.factories";
import {Runner} from "./runner";
import {CommandTrigger} from './command.run';
import logger from './logger';
import handleReturn from './task.return.values';

const debug = require('debug')('cb:task.runner');
const assign = require('object-assign');

export interface TaskRunner {
    tasks: Tasks
    sequence: SequenceItem[]
    runner: Runner
}

export interface TaskErrorStats {
    endTime: number
    completed: boolean
    errors: Error[]
}

export interface TaskStats {
    startTime: number
    endTime: number
    duration: number
    started: boolean
    completed: boolean
    errors: Error[]
}

export interface Report {
    item: SequenceItem
    type: TaskReportType
}

export enum TaskReportType {
    start = <any>"start",
    end = <any>"end",
    error = <any>"error"
}

export interface TaskReport extends Report {
    stats: TaskStats
}

export interface TaskErrorReport extends Report {
    stats: TaskErrorStats
}

/**
 * This creates a wrapper around the actual function that will be run.
 * This done to allow the before/after reporting to work as expected for consumers
 */
export function createObservableFromSequenceItem(item: SequenceItem, trigger: CommandTrigger, tracker$) {

    return Rx.Observable.create(observer => {

        const stats = getStartStats(new Date().getTime());

        debug(`> seqUID ${item.seqUID} started`);

        observer.onNext(getTaskReport(TaskReportType.start, item, stats));

        observer.done = function () {
            observer.onNext(getTaskReport(TaskReportType.end, item, getEndStats(stats)));
            observer.onCompleted();
        };

        var output;

        output = item.factory(item.config, trigger, observer, tracker$);

        if (output !== undefined) {
            if (output.type) {
                if (output.type === 'child_process') {
                    debug('child process returned');
                    const child = output.child;
                    var single = new Rx.SingleAssignmentDisposable();
                    var dis = Rx.Disposable.create(function () {
                        if ((typeof output.child.raw.exitCode) !== 'number') {
                            debug('tearing down a child_process because exitCode is missing');
                            child.removeAllListeners('close');
                            child.kill('SIGINT');
                            child.on('close', function () {
                                debug('close method on child encountered');
                                single.dispose();
                            });
                        } else {
                            debug('child process already completed, not disposing');
                            single.dispose();
                        }
                    });
                    single.setDisposable(dis);
                    return single
                }
            }
            return handleReturn(output, observer);
        }

        /**
         * If the argument length is less than 3, it means the user
         * has not asked for access to the observer - which means
         * we can complete the task immediately
         */
        if (item.factory.length < 3) {
            return observer.onCompleted();
        }

    }).catch(error => {
        /**
         * **--**--MAGIC--**--**
         * If a task throws an error of any kind, we want that error to propagate as normal,
         * but we want tp prepend an error report so that the error report can be observed
         * before the sequence ends.
         */
        return Rx.Observable.concat(
            Rx.Observable.just(getTaskErrorReport(item, getErrorStats(error))),
            Rx.Observable.throw(error)
        );
    });
}

/**
 * Factory for TaskReports
 */
function getTaskReport(type: TaskReportType, item: SequenceItem, stats: TaskStats): TaskReport {
    return {type, item, stats};
}

/**
 * Create a new stats object with startTime
 */
export function getStartStats(startTime: number): TaskStats {
    return {
        startTime,
        started: true,
        endTime: 0,
        duration: 0,
        completed: false,
        errors: []
    }
}

/**
 * Create a new stats object with completed/duration flags etc
 */
function getEndStats(stats: TaskStats) {
    const now = new Date().getTime();
    return assign({}, stats, {
        endTime: now,
        duration: now - stats.startTime,
        completed: true
    })
}

/**
 * Factory for TaskReports that errored
 */
function getTaskErrorReport(item: SequenceItem, stats: TaskErrorStats): TaskErrorReport {
    return {type: TaskReportType.error, item, stats};
}

/**
 * Get basic stats for a task error
 */
function getErrorStats(error: Error): TaskErrorStats {
    const now = new Date().getTime();
    return {
        endTime: now,
        completed: false,
        errors: [error]
    }
}
