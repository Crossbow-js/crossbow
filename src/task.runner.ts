import {TaskTypes} from "./task.resolve";
const Rx = require('rx');

import {Tasks} from "./task.resolve";
import {SequenceItem} from "./task.sequence.factories";
import {CommandTrigger} from './command.run';
import handleReturnType from "./task.return.values";
import {CrossbowError} from "./reporters/defaultReporter";
import {join} from "path";

const debug = require('debug')('cb:task.runner');
const _ = require('../lodash.custom');
const once = require('once');
const domain = require('domain');

export interface Runner {
    series: ()   => Rx.Observable<TaskReport>
    parallel: () => Rx.Observable<TaskReport>,
    sequence:    SequenceItem[]
}

export interface TaskRunner {
    tasks: Tasks
    sequence: SequenceItem[]
    runner: Runner
}

export interface TaskErrorStats {
    endTime: number
    completed: boolean
    errors: Error[]
    cbError?: boolean
    cbExitCode?: number
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

        /**
         * Complete immediately if this item was marked
         * as 'skipped'
         */
        if (item.task.skipped) {
            observer.onNext(getTaskReport(TaskReportType.end, item, getEndStats(stats)));
            observer.onCompleted();
            return;
        }

        if (item.task.if.length && trigger.shared.getValue().hasIn(['if'])) {
            const hasChanges = trigger.shared
                .getValue()
                .getIn(['if'])
                .filter(x => {
                    return item.task.if.indexOf(x.get('path')) !== -1;
                })
                .some(x => x.get('changed'));

            if (!hasChanges) {
                observer.onNext(getTaskReport(TaskReportType.end, item, getEndStats(stats)));
                observer.onCompleted();
                return;
            }
        }

        if (item.task.type === TaskTypes.InlineFunction
        || item.task.type === TaskTypes.ExternalTask
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
            var domainBoundFn = d.bind(item.factory.bind(null, item.options, trigger));

            function done(err?: Error) {
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
                 * for this task - which also means it MUST signify completion
                 * via the callback
                 */
                if (!returns && typeof result === 'function') {
                    if (argCount >= 3) {
                        return result;
                    } else {
                        done(new Error('You returned tear-down logic, but you never asked for the completion callback'));
                        return;
                    }
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
    return _.assign({}, stats, {
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
function getErrorStats(error: CrossbowError): TaskErrorStats {

    const now = new Date().getTime();

    if (error._cbError) {
        return {
            endTime: now,
            completed: false,
            errors: [error],
            cbError: true,
            cbExitCode: error._cbExitCode
        }
    }

    return {
        endTime: now,
        completed: false,
        errors: [error]
    }
}
