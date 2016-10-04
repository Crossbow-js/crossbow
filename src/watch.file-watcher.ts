import {Watcher, CBWatchOptions} from "./watch.resolve";
import * as seq from './task.sequence';
import {CommandTrigger} from "./command.run";
import {TaskReport, TaskReportType} from "./task.runner";
import Rx = require("rx");
import {SequenceItem} from "./task.sequence.factories";
import {ReportTypes, WatcherTriggeredTasksReport} from "./reporter.resolve";
import {CrossbowReporter} from "./index";
import {WatchCommandEventTypes, WatchCommandReport, WatchCommandSetupErrors} from "./command.watch";

const debug = require('debug')('cb:watch.runner');

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

    /**
     * Now map file-change events to task running
     */
    return Rx.Observable
        .merge(...watchersAsObservables)
        .timestamp(trigger.config.scheduler)
        .flatMap((incoming: {value: WatchEvent, timestamp: number}, i: number) => {

            const watchEvent = incoming.value;

            /**
             * Get the watcher linked to the current file event
             * @type {Watcher}
             */
            const watcher = watchers.filter(x => x.watcherUID === watchEvent.watcherUID)[0];

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

            return Rx.Observable.create<WatchCommandReport<WatchTaskReport|WatchRunnerComplete>>(function (obs) {

                /**
                 * todo: Is there a way to handle this without
                 * subscribing manually?
                 */
                watcher._runner.series()
                    .do(taskReport => obs.onNext({
                        type: WatchCommandEventTypes.WatchTaskReport,
                        data: {
                            taskReport,
                            watchEvent,
                            count: i
                        }
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
                                type: ReportTypes.Summary,
                                data: {
                                    sequence: sequence,
                                    cli: trigger.cli,
                                    title: watcher.tasks.join(', '),
                                    config: trigger.config,
                                    runtime: x.timestamp - incoming.timestamp
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

                        obs.onCompleted();
                    });
            });
        });

    // let paused = [];
    // let {reporter} = trigger;
    //
    // return Rx.Observable
    //     /**
    //      * Take each <Watcher> and create an observable stream for it,
    //      * merging them all together
    //      */
    //     .merge(watchers.map(x => createObservableForWatcher(x, trigger)))
    //     /**
    //      * Map each file-change event into a stream of Rx.Observable<TaskReport>
    //      * todo - allow parallel + series running here
    //      */
    //     .filter((x: WatchEvent) => {
    //         if (x.runner.options.block && paused.indexOf(x.watcherUID) > -1) {
    //             debug('File change blocked');
    //             return false;
    //         }
    //         return true;
    //     })
    //     .do(x => {
    //         if (x.runner.options.block) {
    //             paused.push(x.watcherUID);
    //         }
    //     })
    //     .flatMap((watchEvent: WatchEvent, index) => {
    //
    //         /** LOG **/
    //         reporter({type: ReportTypes.WatcherTriggeredTasks, data: {index, taskCollection: watchEvent.runner.tasks}});
    //         /** LOG END **/
    //
    //         const timer = new Date().getTime();
    //         const upcoming = watchEvent.runner._runner
    //             // todo support parallel running here
    //             .series()
    //             .do(function (val) {
    //                 // Push reports onto tracker
    //                 // for cross-watcher reports
    //                 trigger.tracker.onNext(val);
    //             })
    //             .do((report: TaskReport) => {
    //                 // todo - simpler/shorter format for task reports on watchers
    //                 if (trigger.config.progress) {
    //                     reporter({type: ReportTypes.WatchTaskReport, data: {report, trigger}}); // always log start/end of tasks
    //                 }
    //                 if (report.type === TaskReportType.error) {
    //                     console.log(report.stats.errors[0].stack);
    //                 }
    //             })
    //             .toArray()
    //             .flatMap((reports: TaskReport[]) => {
    //                 const incoming = seq.decorateSequenceWithReports(watchEvent.runner._sequence, reports);
    //                 const errorCount = seq.countSequenceErrors(incoming);
    //
    //                 /** LOG **/
    //                 if (errorCount > 0) {
    //                     reporter({type: ReportTypes.Summary, data: {
    //                         sequence: incoming,
    //                         cli: trigger.cli,
    //                         title: watchEvent.runner.tasks.join(', '),
    //                         config: trigger.config,
    //                         runtime: new Date().getTime() - timer
    //                     }});
    //                 } else {
    //                     reporter({type: ReportTypes.WatcherTriggeredTasksCompleted, data: {index, taskCollection: watchEvent.runner.tasks, time: new Date().getTime() - timer}});
    //                 }
    //                 /** LOG END **/
    //
    //                 return Rx.Observable.just({type: WatchCommandEventTypes.FileEvent, data: {sequence: incoming, watchEvent: watchEvent}});
    //             });
    //         return upcoming;
    //     })
    //     .do((completion: WatchCommandReport<WatchEvent>) => {
    //         paused = paused.filter(x => x !== completion.data.watchEvent.watcherUID);
    //     });
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
