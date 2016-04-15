import {Watcher} from "./watch.resolve";
import * as reporter from './reporters/defaultReporter';
import {CommandTrigger} from "./command.run";
import {TaskReport} from "./task.runner";

const debug = require('debug')('cb:watch.runner');
const chokidar = require('chokidar');

export interface WatchEvent {
    event: string
    path: string
    runner: Watcher
    watcherUID: string
    duration?: number
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
         * Discard repeated file-change events that happend within the theshold
         */
        .debounce(500)
        /**
         * Map each file-change event into a stream of Rx.Observable<TaskReport>
         * todo - allow parallel + series running here
         */
        .flatMap((watchEvent: WatchEvent) => {
            return watchEvent.runner._runner.series(tracker$);
        });
}

/**
 * Create a file-system watcher that will emit <WatchEvent>
 */
export function createObservableForWatcher (watcher: Watcher): Rx.Observable<WatchEvent> {
    return Rx.Observable.create((observer: Rx.Observer<WatchEvent>) => {

        /** DEBUG **/
        debug(`+ [id:${watcher.watcherUID}] ${watcher.patterns.length} patterns (${watcher.patterns})`);
        debug(` - ${watcher.tasks.length} tasks (${watcher.tasks})`);
        /** DEBUG END **/

        const chokidarWatcher = chokidar.watch(watcher.patterns, watcher.options)
            .on('all', function (event, path) {
                observer.onNext({
                    event:      event,
                    path:       path,
                    runner:     watcher,
                    watcherUID: watcher.watcherUID,
                    duration:   0
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