import {Watcher, CBWatchOptions} from "./watch.resolve";
import * as seq from './task.sequence';
import {CommandTrigger} from "./command.run";
import {TaskReport, TaskReportType} from "./task.runner";
import Rx = require("rx");
import {SequenceItem} from "./task.sequence.factories";
import {ReportNames} from "./reporter.resolve";
import {CrossbowReporter} from "./index";

const debug = require('debug')('cb:watch.runner');

export interface WatchEvent {
    event: string
    path: string
    runner: Watcher
    watcherUID: string
    duration?: number
}

export interface WatchEventCompletion {
    sequence: SequenceItem[]
    watchEvent: WatchEvent
}

/**
 * Create a stream that is the combination of all watchers
 */
export function createObservablesForWatchers(watchers: Watcher[], trigger: CommandTrigger): Rx.Observable<WatchEventCompletion> {

    let paused = [];
    let {reporter} = trigger;

    return Rx.Observable
        /**
         * Take each <Watcher> and create an observable stream for it,
         * merging them all together
         */
        .merge(watchers.map(x => createObservableForWatcher(x, trigger.reporter)))
        /**
         * Map each file-change event into a stream of Rx.Observable<TaskReport>
         * todo - allow parallel + series running here
         */
        .filter((x: WatchEvent) => {
            if (x.runner.options.block && paused.indexOf(x.watcherUID) > -1) {
                debug('File change blocked');
                return false;
            }
            return true;
        })
        .do(x => {
            if (x.runner.options.block) {
                paused.push(x.watcherUID);
            }
        })
        .flatMap((watchEvent: WatchEvent, i) => {

            /** LOG **/
            reporter(ReportNames.WatcherTriggeredTasks, i, watchEvent.runner.tasks);
            /** LOG END **/

            const timer = new Date().getTime();
            const upcoming = watchEvent.runner._runner
                // todo support parallel running here
                .series()
                .do(function (val) {
                    // Push reports onto tracker
                    // for cross-watcher reports
                    trigger.tracker.onNext(val);
                })
                .do((x: TaskReport) => {
                    // todo - simpler/shorter format for task reports on watchers
                    if (trigger.config.progress) {
                        reporter(ReportNames.WatchTaskReport, x, trigger); // always log start/end of tasks
                    }
                    if (x.type === TaskReportType.error) {
                        console.log(x.stats.errors[0].stack);
                    }
                })
                .toArray()
                .flatMap((reports: TaskReport[]) => {
                    const incoming = seq.decorateSequenceWithReports(watchEvent.runner._sequence, reports);
                    const errorCount = seq.countSequenceErrors(incoming);

                    /** LOG **/
                    if (errorCount > 0) {
                        reporter(ReportNames.Summary, incoming, trigger.cli, watchEvent.runner.tasks.join(', '), trigger.config, new Date().getTime() - timer);
                    } else {
                        reporter(ReportNames.WatcherTriggeredTasksCompleted, i, watchEvent.runner.tasks, new Date().getTime() - timer);
                    }
                    /** LOG END **/

                    return Rx.Observable.just({sequence: incoming, watchEvent: watchEvent});
                });
            return upcoming;
        })
        .do((completion: WatchEventCompletion) => {
            paused = paused.filter(x => x !== completion.watchEvent.watcherUID);
        });
}

/**
 * Create a file-system watcher that will emit <WatchEvent>
 */
export function createObservableForWatcher(watcher: Watcher, reporter): Rx.Observable<WatchEvent> {

    /**
     * First create a stream of file-watcher events for this Watcher
     */
    const output$ = getRawOutputStream(watcher, reporter);

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

    return applyOperators(output$, additionalOperators, watcher.options);
}

export function getRawOutputStream(watcher: Watcher, reporter: CrossbowReporter): Rx.Observable<WatchEvent> {

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
                    runner: watcher,
                    watcherUID: watcher.watcherUID,
                    duration: 0
                });
            });

        chokidarWatcher.on('ready', () => {

            /** DEBUG **/
            debug(`√ [id:${watcher.watcherUID}] watcher ready (${watcher.patterns})`);
            /** DEBUG END **/

            if (Object.keys(chokidarWatcher.getWatched()).length === 0) {
                reporter(ReportNames.NoFilesMatched, watcher);
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
function applyOperators(source: Rx.Observable<any>, items: {option: string, fnName: string}[], options: CBWatchOptions): Rx.Observable<any> {
    return items.reduce((stream$, item) => {
        const value = options[item.option];
        if (value !== undefined && value > 0) {
            return stream$[item.fnName].call(stream$, value);
        }
        return stream$;
    }, source);
}
