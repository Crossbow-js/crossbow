/// <reference path="../typings/main.d.ts" />

import {CommandTrigger} from './command.run';
import {CrossbowConfiguration} from './config';
import {CrossbowInput, Meow} from './index';
import {resolveTasks} from "./task.resolve";

import * as seq from "./task.sequence";

import {WatchTaskRunner} from "./watch.runner";
import {WatchTasks, Watcher, resolveWatchTasks, resolveBeforeTasks} from './watch.resolve';

import * as reporter from './reporters/defaultReporter';
import {TaskReport, TaskReportType} from "./task.runner";
import {SequenceItem} from "./task.sequence.factories";

const debug    = require('debug')('cb:command.watch');
const merge    = require('lodash.merge');
const assign   = require('object-assign');
const chokidar = require('chokidar');

import Rx = require('rx');

interface Reports {
    reports: TaskReport[]
    decoratedSequence: SequenceItem[]
}

export interface WatchTrigger extends CommandTrigger {
    type: 'watcher'
}

export interface WatchEvent {
    event:      string
    path:       string
    runner:     Watcher
    watcherUID: string
    duration?:  number
}

export interface WatchRunners {
    all: Watcher[]
    valid: Watcher[]
    invalid: Watcher[]
}

export interface UnwrappedTask {
    patterns: string[]
    tasks: string[]
    i: number
    name: string
}

export default function execute (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration): WatchTaskRunner {

    /**
     * First, allow modifications to the current context
     * (such as shorthand watchers, for instance)
     * @type {WatchTrigger}
     */
    const trigger = getContext({cli, input, config, type: 'watcher'});

    debug(`Working with input [${trigger.cli.input}]`);

    /**
     * First Resolve the task names given in input.
     */
    const watchTasks = resolveWatchTasks(trigger.cli.input, trigger);

    debug(`${watchTasks.valid.length} valid task(s)`);
    debug(`${watchTasks.invalid.length} invalid task(s)`);

    /**
     * Create runners for watch tasks;
     */
    const runners = createRunners(watchTasks, trigger);

    /**
     * Check if the user intends to handle running the tasks themselves,
     * if that's the case we give them the resolved tasks along with
     * the sequence and the primed runner
     */
    if (config.handoff) {
        debug(`Handing off Watchers`);
        return {tasks: watchTasks, runners};
    }

    debug(`Not handing off, will handle watching internally`);

    /**
     * Never continue if any tasks were flagged as
     */
    if (watchTasks.invalid.length) {
        reporter.reportWatchTaskErrors(watchTasks.all, cli, input);
        return;
    }

    const tracker = new Rx.Subject();
    const tracker$ = tracker
        .filter((x: TaskReport) => {
            // todo more robust way of determining if the current value was a report from crossbow (could be a task produced value)
            return typeof x.type === 'string';
        })
        .share();

    /**
     * Never continue if any of the BEFORE tasks were flagged as invalid
     */
    const beforeRunner = getBeforeTaskRunner(cli, trigger, watchTasks, tracker$);

    /**
     * Never continue if any runners are invalid
     */
    if (runners.invalid.length) {
        runners.all.forEach(runner => reporter.reportWatchTaskTasksErrors(runner._tasks.all, runner.tasks, runner, config));
        return;
    }

    Rx.Observable.concat(
        beforeRunner.do(() => reporter.reportWatchers(watchTasks.valid, config)),
        createObservablesForWatchers(runners.valid, trigger, tracker$)
            .filter(x => {
                // todo more robust way of determining if the current value was a report from crossbow (could be a task produced value)
                return typeof x.type === 'string';
            })
            .do(tracker)
            .do((x: TaskReport) => {
                // todo - simpler/shorter format for task reports on watchers
                reporter.watchTaskReport(x, trigger); // always log start/end of tasks
                if (x.type === TaskReportType.error) {
                    console.log(x.stats.errors[0].stack);
                }
            })
        // don't accept/catch any errors here as they may
        // belong to an outsider
    ).subscribe();
}

function getBeforeTaskRunner (cli: Meow,
                              trigger: WatchTrigger,
                              watchTasks: WatchTasks,
                              tracker$: Rx.Observable<any>): Rx.Observable<any> {
    /**
     * Get 'before' task list
     */
    const beforeTasksAsCliInput = resolveBeforeTasks(trigger.input, watchTasks.valid);

    if (!beforeTasksAsCliInput.length) {
        return Rx.Observable.just(true);
    }

    debug(`Combined global + task specific 'before' tasks [${beforeTasksAsCliInput}]`);

    /**
     * Now Resolve the before task names given in input.
     */
    const beforeTasks = resolveTasks(beforeTasksAsCliInput, trigger);

    if (beforeTasks.invalid.length) {
        reporter.reportBeforeWatchTaskErrors(watchTasks, trigger);
        return Rx.Observable.throw(new Error('Before task resolution failed'));
    }

    const beforeSequence = seq.createFlattenedSequence(beforeTasks.valid, trigger);
    const beforeRunner   = seq.createRunner(beforeSequence, trigger);

    /**
     * Report task list that's about to run
     */
    reporter.reportBeforeTaskList(beforeSequence, cli, trigger.config);

    /**
     * A generic timestamp to mark the beginning of the tasks
     * @type {number}
     */
    const beforeTimestamp = new Date().getTime();
    const report = (seq: SequenceItem[]) => reporter.reportSummary(seq, cli, 'Before tasks Total:', trigger.config, new Date().getTime() - beforeTimestamp);

    return beforeRunner
        .series(tracker$) // todo - should this support parallel run mode also?
        .filter(x => {
            // todo more robust way of determining if the current value was a report from crossbow (could be a task produced value)
            return typeof x.type === 'string';
        })
        .do(report => {
            if (trigger.config.progress) {
                reporter.taskReport(report, trigger);
            }
        })
        .toArray()
        .map((reports): SequenceItem[] => {
            return seq.decorateCompletedSequenceItemsWithReports(beforeSequence, reports);
        })
        .flatMap((incoming: SequenceItem[]) => {
            const errorCount = seq.countSequenceErrors(incoming);
            if (errorCount > 0) {
                report(incoming);
                return Rx.Observable.throw(new Error('Before tasks did not complete!'));
            }
            return Rx.Observable.just(incoming);
        })
        .do(function (incoming: SequenceItem[]) {
            report(incoming);
        });
}

/**
 * Create a stream that is the combination of all file-watcher
 * events.
 */
function createObservablesForWatchers (watchers: Watcher[],
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
function createObservableForWatcher (watcher: Watcher): Rx.Observable<WatchEvent> {
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

function getContext(trigger: WatchTrigger): WatchTrigger {
    /**
     * First, unwrap each item. If it has a <pattern> -> <task> syntax
     * then we split it, otherwise just return empty arrays for
     * both patterns and tasks
     */
    const unwrapped = trigger.cli.input.slice(1).map(unwrapShorthand);

    /**
     * Next take any items that were split and
     * generate a fake watch config object
     * @type
     */
    const fakeWatchConfig = unwrapped.reduce((acc, item) => {
        if (item.tasks.length) {
            acc[item.name] = {
                watchers: [{
                    patterns: item.patterns,
                    tasks: item.tasks
                }]
            };
        }
        return acc;
    }, {});

    /**
     * Now merge the fake watch config with original
     * @type {WatchTrigger}
     */
    const moddedCtx = <WatchTrigger>merge({}, trigger, {
        input: {
            watch: fakeWatchConfig
        }
    });

    /**
     * Override the CLI input to include the newly split names
     * @type {*[]}
     */
    moddedCtx.cli.input = unwrapped.map(x => x.name);

    return moddedCtx;
}

function createRunners (watchTasks: WatchTasks, ctx: CommandTrigger): WatchRunners {

    const runners = watchTasks.valid.reduce(function (acc, item) {

        return acc.concat(item.watchers.map(function (watcher) {

            const tasks    = resolveTasks(watcher.tasks, ctx);

            const subject  = assign({}, watcher, {
                _tasks: tasks,
                parent: item.name
            });

            if (tasks.invalid.length) {
                return subject;
            }

            subject._sequence = seq.createFlattenedSequence(tasks.valid, ctx);
            subject._runner   = seq.createRunner(subject._sequence, ctx);

            return subject;
        }));
    }, []);

    return {
        all: runners,
        valid: runners.filter(x => validateRunner(x)),
        invalid: runners.filter(x => !validateRunner(x)),
    }
}

function validateRunner (x) {
    return x._tasks.invalid.length === 0;
}

/**
 * take the following:
 *  $ crossbow watch "*.js -> (lint) (unit)"
 *
 *  and convert it into
 *  patterns: ["*.js"]
 *  tasks: ["lint", "unit"]
 */
export function unwrapShorthand(incoming:string, i:number): UnwrappedTask {
    var patterns = [];
    var tasks = [];

    if (incoming.indexOf(' -> ') > -1) {
        const split = incoming.split(' -> ').map(x => x.trim());
        patterns = split[0].split(':');
        if (split[1]) {
            const _tasks = split[1].match(/\(.+?\)/g);
            if (_tasks) {
                tasks = _tasks.map(x => x.slice(1, -1).trim());
            } else {
                tasks = [split[1]];
            }
        }
        return {patterns, tasks, i, name: `_shorthand_${i}`}
    }
    return {patterns, tasks, i, name: incoming}
}

export function handleIncomingWatchCommand (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {
    if (cli.input.length === 1 || config.interactive) {
        if (cli.input.length === 1) {
            reporter.reportNoWatchTasksProvided();
            return;
        }
    }

    return execute(cli, input, config);
}
