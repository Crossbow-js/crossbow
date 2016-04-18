import {Watcher, CBWatchOptions} from "./watch.resolve";
import * as reporter from './reporters/defaultReporter';
import {CommandTrigger} from "./command.run";
import {TaskReport} from "./task.runner";
import Rx = require("rx");

const debug = require('debug')('cb:watch.runner');
const chokidar = require('chokidar');

export interface WatchEvent {
    event:string
    path:string
    runner:Watcher
    watcherUID:string
    duration?:number
}

/**
 * Create a stream that is the combination of all watchers
 */
export function createObservablesForWatchers (watchers: Watcher[],
                                       trigger: CommandTrigger,
                                       tracker$: Rx.Observable<any>): Rx.Observable<TaskReport> {
    return Rx.Observable
        /**
         * Take each <Watcher> and create an observable stream for it,
         * merging them all together
         */
        .merge(watchers.map(createObservableForWatcher))
        /**
         * Map each file-change event into a stream of Rx.Observable<TaskReport>
         * todo - allow parallel + series running here
         */
        .flatMap((watchEvent:WatchEvent) => {
            console.log(watchEvent.runner.tasks);
            return watchEvent.runner._runner.series(tracker$);
        });
}

/**
 * Create a file-system watcher that will emit <WatchEvent>
 */
export function createObservableForWatcher(watcher:Watcher): Rx.Observable<WatchEvent> {

    /**
     * First create a stream of file-watcher events for this Watcher
     */
    const output$ = getRawOutputStream(watcher);

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
        }
    ];

    return applyOperators(output$, additionalOperators, watcher.options);
}

function getRawOutputStream(watcher: Watcher): Rx.Observable<WatchEvent> {
    return Rx.Observable.create((observer:Rx.Observer<WatchEvent>) => {

        /** DEBUG **/
        debug(`+ [id:${watcher.watcherUID}] ${watcher.patterns.length} patterns (${watcher.patterns})`);
        debug(` - ${watcher.tasks.length} tasks (${watcher.tasks})`);
        /** DEBUG END **/

        const chokidarWatcher = chokidar.watch(watcher.patterns, watcher.options)
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
                reporter.reportNoFilesMatched(watcher);
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
function applyOperators (source: Rx.Observable<any>, items: {option:string, fnName:string}[], options: CBWatchOptions): Rx.Observable<any> {
    return items.reduce((stream$, item) => {
        const value = options[item.option];
        if (value !== undefined && value > 0) {
            return stream$[item.fnName].call(stream$, value);
        }
        return stream$;
    }, source);
}
