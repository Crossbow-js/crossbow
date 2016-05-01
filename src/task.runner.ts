import {TaskTypes} from "./task.resolve";
const Rx = require('rx');

import {Tasks} from "./task.resolve.d";
import {SequenceItem} from "./task.sequence.factories";
import {Runner} from "./runner";
import {CommandTrigger} from './command.run';
import handleReturnType from "./task.return.values";

const debug = require('debug')('cb:task.runner');
const assign = require('object-assign');
const once = require('once');
const domain = require('domain');

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
export function createObservableFromSequenceItem(item: SequenceItem, trigger: CommandTrigger) {

    return Rx.Observable.create(observer => {

        const stats = getStartStats(new Date().getTime());

        debug(`> seqUID ${item.seqUID} started`);

        observer.onNext(getTaskReport(TaskReportType.start, item, stats));

        var argCount  = item.factory.length;

        if (item.task.type === TaskTypes.InlineFunction
        || item.task.type === TaskTypes.RunnableModule
        || item.task.type === TaskTypes.Adaptor) {


            const argCount = item.factory.length;
            const cb = once(function (err) {
                if (err) {
                    observer.onError(err);
                    return;
                }
                observer.onNext(getTaskReport(TaskReportType.end, item, getEndStats(stats)));
                observer.onCompleted();
            });

            function onError(err) {
                cb(err);
            }

            var d = domain.create();
            d.once('error', onError);
            var domainBoundFn = d.bind(item.factory.bind(null, item.config, trigger));

            function done() {
                d.removeListener('error', onError);
                d.exit();
                return cb.apply(null, arguments);
            }
            
            var result  = domainBoundFn(done);

            if (result) {

                var returns = handleReturnType(result, done);

                /**
                 * If the return value does not need to be consumed,
                 * but it is IS a function, assume it's the tear-down logic
                 * for this task.
                 */
                if (!returns && typeof result === 'function') {
                    done();
                    return result;
                }
            } else {

                /**
                 * Assume sync function if nothing returned
                 * and 3rd argument was not asked for
                 */
                if (argCount < 3) {
                    done();
                    return;
                }
            }
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
