import {Watcher, CBWatchOptions} from "./watch.resolve";
import * as seq from './task.sequence';
import {CommandTrigger} from "./command.run";
import {TaskReport, TaskReportType} from "./task.runner";
import Rx = require("rx");
import {SequenceItem} from "./task.sequence.factories";
import {ReportTypes, WatcherTriggeredTasksReport} from "./reporter.resolve";
import {CrossbowReporter} from "./index";
import {WatchCommandEventTypes, WatchCommandReport} from "./command.watch";

const debug = require('debug')('cb:watch.runner');

export interface WatchEventWithContext {
    watchEvent: WatchEvent
    watcher: Watcher
}

export interface WatchEvent {
    event: string
    path: string
    watcherUID: string
}

export interface WatchTaskReport {
    taskReport: TaskReport
    watchEvent: WatchEvent
    count: number
}

export interface WatchRunnerComplete {
    sequence: SequenceItem[]
    reports: TaskReport[]
    errors: TaskReport[]
    watchEvent: WatchEvent
    runtime: number
}

/**
 * Create a stream that is the combination of all watchers
 */
export function createObservablesForWatchers(watchers: Watcher[], trigger: CommandTrigger): Rx.Observable<WatchCommandReport<WatchTaskReport|WatchRunnerComplete>> {

    /**
     * Wrap every chokidar watcher in an observable
     * @type {Rx.Observable<WatchEvent>[]}
     */
    const watchersAsObservables = watchers.map((watcher) => {
        return createObservableForWatcher(watcher, trigger);
    });

    const blockable$ = new Rx.BehaviorSubject<string[]>([]);

    /**
     * Now map file-change events to task running
     */
    return Rx.Observable
        /**
         * Merge all watchers
         */
        .merge(...watchersAsObservables)
        /**
         * Pair up the watchEvent with it's watcher.
         * This separation is done to allow us to pass an observable
         * in to stub the file io stream
         */
        .map<WatchEventWithContext>((watchEvent: WatchEvent) => {
            const watcher = watchers.filter(x => x.watcherUID === watchEvent.watcherUID)[0];
            return {watchEvent, watcher};
        })
        /**
         * If the incoming watch had block: true as an option
         * check if it's watcherUID exists in the blockable$
         */
        .filter((x: WatchEventWithContext) => {
            if (x.watcher.options.block) {
                const blocked = !~blockable$.getValue().indexOf(x.watchEvent.watcherUID);
                debug(`BLOCKED - ${x.watchEvent.watcherUID} ${x.watchEvent.path} ${x.watchEvent.event}`);
                return blocked
            }
            return true;
        })
        .do((x: WatchEventWithContext) => {
            if (x.watcher.options.block) {
                blockable$.onNext(blockable$.getValue().concat(x.watchEvent.watcherUID));
            }
        })
        .timestamp(trigger.config.scheduler)
        .flatMap((incoming: {value: WatchEventWithContext, timestamp: number}, i: number) => {
            return runTasks(incoming, i);
        });

    function runTasks (incoming, i: number) {
        /**
         * @type {WatchEvent}
         */
        const {watchEvent, watcher} = incoming.value;

        return Rx.Observable.create<WatchCommandReport<WatchTaskReport|WatchRunnerComplete>>(function (obs) {

            /**
             * Report start of task run
             */
            trigger.reporter({
                type: ReportTypes.WatcherTriggeredTasks,
                data: {
                    index: i,
                    taskCollection: watcher.tasks
                }
            } as WatcherTriggeredTasksReport);

            /**
             * todo: Is there a way to handle this without subscribing manually?
             */
            watcher._runner.series()
                .do(taskReport => obs.onNext({
                    type: WatchCommandEventTypes.WatchTaskReport,
                    data: {
                        taskReport,
                        watchEvent,
                        count: i
                    } as WatchTaskReport
                }))
                .toArray()
                .timestamp(trigger.config.scheduler)
                .subscribe(function (x: {value: TaskReport[], timestamp; number}) {

                    const reports = x.value;
                    const sequence = seq.decorateSequenceWithReports(watcher._sequence, reports);
                    const errors   = reports.filter(x => x.type === TaskReportType.error);

                    obs.onNext({
                        type: WatchCommandEventTypes.WatchRunnerComplete,
                        data: {
                            sequence,
                            reports,
                            errors,
                            watchEvent,
                            runtime: x.timestamp - incoming.timestamp
                        } as WatchRunnerComplete
                    });

                    if (errors.length > 0) {
                        trigger.reporter({
                            type: ReportTypes.WatcherSummary,
                            data: {
                                sequence: sequence,
                                cli:      trigger.cli,
                                title:    watcher.tasks.join(', '),
                                config:   trigger.config,
                                runtime:  x.timestamp - incoming.timestamp,
                                watcher,
                                watchEvent
                            }
                        });
                    } else {
                        trigger.reporter({
                            type: ReportTypes.WatcherTriggeredTasksCompleted,
                            data: {
                                index: i,
                                taskCollection: watcher.tasks,
                                time: x.timestamp - incoming.timestamp
                            }
                        });
                    }

                    const withoutThis = blockable$.getValue().filter(x => x !== watchEvent.watcherUID);

                    blockable$.onNext(withoutThis);

                    obs.onCompleted();
                });
        });
    }
}

/**
 * Create a file-system watcher that will emit <WatchEvent>
 */
export function createObservableForWatcher(watcher: Watcher, trigger: CommandTrigger): Rx.Observable<WatchEvent> {

    const {reporter}  = trigger;
    const {scheduler} = trigger.config;

    /**
     * First create a stream of file-watcher events for this Watcher
     */
    const output$ = trigger.config.fileChangeObserver || getFileChangeStream(watcher, reporter);

    /**
     * Specify a mapping from option name -> Rx.Observable operator name
     */
    const additionalOperators = [
        {
            option: 'debounce',
            fnName: 'debounce'
        },
        {
            option: 'throttle',
            fnName: 'throttle'
        },
        {
            option: 'delay',
            fnName: 'delay'
        }
    ];

    return applyOperators(output$, additionalOperators, watcher.options, scheduler);
}

export function getFileChangeStream(watcher: Watcher, reporter: CrossbowReporter): Rx.Observable<WatchEvent> {

    /** DEBUG **/
    debug(`[id:${watcher.watcherUID}] options: ${JSON.stringify(watcher.options, null, 2)}`);
    /** DEBUG END **/

    return Rx.Observable.create((observer: Rx.Observer<WatchEvent>) => {

        /** DEBUG **/
        debug(`+ [id:${watcher.watcherUID}] ${watcher.patterns.length} patterns (${watcher.patterns})`);
        debug(`└─ ${watcher.tasks.length} tasks (${watcher.tasks})`);
        /** DEBUG END **/

        const chokidarWatcher = require('chokidar').watch(watcher.patterns, watcher.options)

            .on('all', function (event, path) {
                debug(`└─ CHOKIDAR EVENT ${event} - ${path}`);
                observer.onNext({
                    event: event,
                    path: path,
                    watcherUID: watcher.watcherUID
                });
            });

        chokidarWatcher.on('ready', () => {

            /** DEBUG **/
            debug(`√ [id:${watcher.watcherUID}] watcher ready (${watcher.patterns})`);
            /** DEBUG END **/

            if (Object.keys(chokidarWatcher.getWatched()).length === 0) {
                reporter({type: ReportTypes.NoFilesMatched, data: {watcher}});
            }
        });

        return () => {
            debug(`- for ${watcher.patterns}`);
            chokidarWatcher.close();
        }
    });
}

/**
 *
 */
function applyOperators(source: Rx.Observable<any>, items: {option: string, fnName: string}[], options: CBWatchOptions, scheduler?): Rx.Observable<any> {
    return items.reduce((stream$, item) => {
        const value = options[item.option];
        if (value !== undefined && value > 0) {
            return stream$[item.fnName].call(stream$, value, scheduler);
        }
        return stream$;
    }, source);
}
