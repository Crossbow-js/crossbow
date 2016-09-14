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
    series:   (ctx?: RunContext) => Rx.Observable<TaskReport>
    parallel: (ctx?: RunContext) => Rx.Observable<TaskReport>,
    sequence: SequenceItem[]
}

export interface TaskRunner {
    tasks: Tasks
    sequence: SequenceItem[]
    runner: Runner
}


export interface TaskStats {
    startTime: number
    endTime: number
    duration: number
    started: boolean
    completed: boolean
    errors: Error[]
    skipped?: boolean
    skippedReadon?: TaskSkipReasons
}

export interface TaskErrorStats {
    endTime: number
    completed: boolean
    errors: Error[]
    cbError?: boolean
    cbExitCode?: number
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

export enum TaskSkipReasons {
    SkipFlag = <any>"SkipFlag",
    IfChanged = <any>"IfChanged"
}

export interface TaskReport extends Report {
    stats: TaskStats
}

export interface TaskErrorReport extends Report {
    stats: TaskErrorStats
}

export type RunContext = Immutable.Map<string, any>;

/**
 * This creates a wrapper around the actual function that will be run.
 * This done to allow the before/after reporting to work as expected for consumers
 */
export function time (scheduler?) {
    return scheduler ? scheduler.now() : new Date().getTime();
}
export function createObservableFromSequenceItem(item: SequenceItem, trigger: CommandTrigger, ctx: RunContext) {

    return Rx.Observable.create(observer => {

        const startTime = time(trigger.config.scheduler);

        /**
         * Complete immediately if this item was marked
         * as 'skipped'
         */
        if (!trigger.config.force && item.task.skipped) {
            const additionalStats = {
                skipped: true,
                skippedReason: TaskSkipReasons.SkipFlag
            };
            const stats = getStartStats(startTime, additionalStats);
            observer.onNext(getTaskReport(TaskReportType.start, item, stats));
            observer.onNext(getTaskReport(TaskReportType.end, item, getEndStats(stats, startTime, additionalStats)));
            observer.onCompleted();
            return;
        }

        /**
         * Complete immediately if this item was marked
         * with an 'ifChanged' predicate
         */
        if (!trigger.config.force && item.task.ifChanged.length && ctx.hasIn(['ifChanged'])) {
            const hasChanges = ctx
                .get('ifChanged')
                .filter(x => {
                    return item.task.ifChanged.indexOf(x.get('userInput')) !== -1;
                })
                .some(x => x.get('changed'));

            if (!hasChanges) {
                const additionalStats = {
                    skipped: true,
                    skippedReason: TaskSkipReasons.IfChanged
                };
                const stats = getStartStats(startTime, additionalStats);
                observer.onNext(getTaskReport(TaskReportType.start, item, stats));
                observer.onNext(getTaskReport(TaskReportType.end, item, getEndStats(stats, startTime, additionalStats)));
                observer.onCompleted();
                return;
            }
        }


        /**
         * Timestamp when this task starts
         * @type {TaskStats}
         */
        const stats = getStartStats(startTime, {skipped: false});
        debug(`> seqUID ${item.seqUID} started`);

        /**
         * Task started
         */
        observer.onNext(getTaskReport(TaskReportType.start, item, stats));

        /**
         * Exit after 1 second if we're in a 'dry run'
         */
        if (trigger.config.dryRun) {
            return Rx.Observable
                .just('dryRun')
                .delay(trigger.config.dryRunDuration, trigger.config.scheduler)
                .do(_ => {
                    observer.onNext(getTaskReport(TaskReportType.end, item, getEndStats(stats, time(trigger.config.scheduler))));
                    observer.onCompleted();
                }).subscribe();
        }

        if (item.task.type === TaskTypes.InlineFunction
        || item.task.type  === TaskTypes.ExternalTask
        || item.task.type  === TaskTypes.Adaptor) {

            const argCount = item.factory.length;
            const cb = once(function (err) {
                if (err) {
                    observer.onError(err);
                    return;
                }
                observer.onNext(getTaskReport(TaskReportType.end, item, getEndStats(stats, time(trigger.config.scheduler))));
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
            Rx.Observable.just(getTaskErrorReport(item, getErrorStats(error, time(trigger.config.scheduler)))),
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
export function getStartStats(startTime: number, additional?:{[index: string]: any}): TaskStats {
    return _.assign(
        {},
        additional,
        {
            startTime,
            started: true,
            endTime: 0,
            duration: 0,
            completed: false,
            errors: []
        }
    );
}

/**
 * Create a new stats object with completed/duration flags etc
 */
function getEndStats(stats: TaskStats, endTime: number, additional?:{[index: string]: any}) {
    return _.assign(
        {},
        stats,
        additional,
        {
            endTime:   endTime,
            duration:  endTime - stats.startTime,
            completed: true
        }
    );
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
function getErrorStats(error: CrossbowError, endTime: number): TaskErrorStats {

    if (error._cbError) {
        return {
            endTime,
            completed: false,
            errors: [error],
            cbError: true,
            cbExitCode: error._cbExitCode
        }
    }

    return {
        endTime,
        completed: false,
        errors: [error]
    }
}
