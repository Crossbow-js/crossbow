import {Watcher, CBWatchOptions} from "./watch.resolve";
import * as seq from "./task.sequence";
import {CommandTrigger} from "./command.run";
import {TaskReport, TaskReportType} from "./task.runner";
import Rx = require("rx");
import {SequenceItem} from "./task.sequence.factories";
import {ReportTypes, WatcherTriggeredTasksReport} from "./reporter.resolve";
import {CrossbowReporter} from "./index";
import {WatchCommandEventTypes} from "./command.watch";
import {fromJS} from "immutable";
import {merge} from "./config";

const debug = require("debug")("cb:watch.runner");

export interface WatchEventWithContext {
    watchEvents?: WatchEvent[];
    watchEvent?: WatchEvent;
    watcher: Watcher;
}

export interface WatchEventGroupedWithContext {
    watchEvents?: WatchEvent[];
    watchEvent?: WatchEvent;
    watcher: Watcher;
}

export interface WatchEvent {
    event: string;
    path: string;
    watcherUID: string;
}

export interface WatchTaskReport {
    taskReport: TaskReport;
    watchEvent: WatchEvent;
    watchEvents: WatchEvent[];
    count: number;
}

export interface WatchRunnerComplete {
    sequence: SequenceItem[];
    reports: TaskReport[];
    errors: TaskReport[];
    watchEvent: WatchEvent;
    watchEvents: WatchEvent[];
    runtime: number;
}

/**
 * Create a stream that is the combination of all watchers
 */
export function createObservablesForWatchers(watchers: Watcher[], trigger: CommandTrigger):
    Rx.Observable<{type: WatchCommandEventTypes, data: WatchTaskReport|WatchRunnerComplete}> {

    /**
     * Wrap every chokidar watcher in an observable
     * @type {Rx.Observable<WatchEvent>[]}
     */
    const _nonGrouped = watchers.filter(watcher => watcher.options.group === 0);
    const _grouped = watchers.filter(watcher => watcher.options.group > 0);
    const watchersAsObservablesNonGrouped = _nonGrouped
        .map((watcher) => {
            return createObservableForWatcher(watcher, trigger);
        });
    const watchersAsObservablesGrouped = _grouped
        .map((watcher) => {
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
        .merge(...watchersAsObservablesNonGrouped, ...watchersAsObservablesGrouped)
        /**
         * Pair up the watchEvent with it's watcher.
         * This separation is done to allow us to pass an observable
         * in to stub the file io stream
         */
        .filter((x: WatchEventWithContext) => {
            if (x.watcher.options.block) {
                const blocked = !~blockable$.getValue().indexOf(x.watcher.watcherUID);
                if (x.watchEvent) {
                    debug(`BLOCKED - ${x.watcher.watcherUID} ${x.watchEvent.path} ${x.watchEvent.event}`);
                } else {
                    x.watchEvents.forEach(watchEvent => {
                        debug(`BLOCKED - ${x.watcher.watcherUID} ${watchEvent.path} ${watchEvent.event}`);
                    })
                }
                return blocked;
            }
            return true;
        })
        .do((x: WatchEventWithContext) => {
            if (x.watcher.options.block) {
                blockable$.onNext(blockable$.getValue().concat(x.watcher.watcherUID));
            }
        })
        .timestamp(trigger.config.scheduler)
        .flatMap((incoming: {value: WatchEventWithContext, timestamp: number}, i: number) => {
            return runTasks(incoming, i);
        });

    function runTasks (incoming: {value: WatchEventGroupedWithContext|WatchEventWithContext, timestamp: number}, i: number) {
        /**
         * @type {WatchEvent}
         */
        const {watchEvent, watcher, watchEvents = []} = incoming.value;

        return Rx.Observable.create<{type: WatchCommandEventTypes, data: WatchTaskReport|WatchRunnerComplete}>(function (obs) {

            /**
             * Report start of task run
             */
            trigger.reporter({
                type: ReportTypes.WatcherTriggeredTasks,
                data: {
                    index: i,
                    taskCollection: watcher.tasks
                } as WatcherTriggeredTasksReport
            });

            /**
             * todo: Is there a way to handle this without subscribing manually?
             */
            watcher._runner.series(fromJS({
                watchEvent,
                watchEvents,
                watcher: {
                    patterns: watcher.patterns,
                    tasks: watcher.tasks,
                    options: watcher.options,
                    watcherUID: watcher.watcherUID
                }
            }))
                .do(taskReport => {
                    const data: WatchTaskReport = {
                        taskReport,
                        watchEvent,
                        watchEvents,
                        count: i
                    };
                    obs.onNext({
                        type: WatchCommandEventTypes.WatchTaskReport,
                        data,
                    });
                })
                .toArray()
                .timestamp(trigger.config.scheduler)
                .subscribe(function (x: {value: TaskReport[], timestamp; number}) {

                    const reports = x.value;
                    const sequence = seq.decorateSequenceWithReports(watcher._sequence, reports);
                    const errors   = reports.filter(x => x.type === TaskReportType.error);

                    const data: WatchRunnerComplete = {
                        sequence,
                        reports,
                        errors,
                        watchEvent,
                        watchEvents,
                        runtime: x.timestamp - incoming.timestamp
                    }
                    obs.onNext({
                        type: WatchCommandEventTypes.WatchRunnerComplete,
                        data,
                    });

                    if (errors.length > 0) {
                        trigger.reporter({
                            type: ReportTypes.WatcherSummary,
                            data: {
                                sequence: sequence,
                                cli:      trigger.cli,
                                title:    watcher.tasks.join(", "),
                                config:   trigger.config,
                                runtime:  x.timestamp - incoming.timestamp,
                                watcher,
                                watchEvent,
                                watchEvents,
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
export function createObservableForWatcher(watcher: Watcher, trigger: CommandTrigger): Rx.Observable<WatchEventWithContext|WatchEventGroupedWithContext> {

    const {reporter}  = trigger;
    const {scheduler} = trigger.config;

    /**
     * First create a stream of file-watcher events for this Watcher
     */
    const output$ = trigger.config.fileChangeObserver || getFileChangeStream(watcher, reporter);

    if (watcher.options.group > 0) {
        return output$
            .buffer(() => output$.debounce(watcher.options.group, scheduler))
            .map(xs => {
                return {
                    watcher,
                    watchEvents: xs,
                }
            }) as Rx.Observable<any>;
    }

    /**
     * Specify a mapping from option name -> Rx.Observable operator name
     */
    const additionalOperators = [
        {
            option: "debounce",
            fnName: "debounce"
        },
        {
            option: "throttle",
            fnName: "throttle"
        },
        {
            option: "delay",
            fnName: "delay"
        }
    ];
    
    return applyOperators(output$, additionalOperators, watcher.options, scheduler)
        .map(x => {
            return {
                watcher,
                watchEvent: x,
            }
        });
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

        const chokidarWatcher = require("chokidar").watch(watcher.patterns, watcher.options)

            .on("all", function (event, path) {
                debug(`└─ CHOKIDAR EVENT ${event} - ${path}`);
                observer.onNext({
                    event: event,
                    path: path,
                    watcherUID: watcher.watcherUID
                });
            });

        chokidarWatcher.on("ready", () => {

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
        };
    }).share();
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
