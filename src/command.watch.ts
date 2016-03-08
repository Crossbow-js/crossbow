/// <reference path="../typings/main.d.ts" />
import {CommandTrigger} from './command.run';
import {CrossbowConfiguration} from './config';
import {CrossbowInput, Meow} from './index';
import {resolveWatchTasks, resolveBeforeTasks} from './watch.resolve';
import {WatchTaskRunner} from "./watch.runner";
import {resolveTasks} from "./task.resolve";
import * as reporter from './reporters/defaultReporter';
import {createFlattenedSequence} from "./task.sequence";
import {createRunner} from "./task.sequence";
import {reportTaskErrors} from "./reporters/defaultReporter";
import {reportWatchTaskTasksErrors} from "./reporters/defaultReporter";
import {reportErrorsFromCliInput} from "./reporters/defaultReporter";
import {WatchTasks} from "./watch.resolve";
import {Watcher} from "./watch.resolve";
import {reportTaskList} from "./reporters/defaultReporter";
import {reportSummary} from "./reporters/defaultReporter";
import {reportNoFilesMatched} from "./reporters/defaultReporter";

const debug  = require('debug')('cb:command.watch');
const merge = require('lodash.merge');
const Rx = require('rx');
const assign = require('object-assign');
const chokidar = require('chokidar');

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
    const ctx = getContext({cli, input, config, type: 'watcher'});

    debug(`Working with input [${ctx.cli.input}]`);

    /**
     * First Resolve the task names given in input.
     */
    const watchTasks = resolveWatchTasks(ctx.cli.input, ctx);

    debug(`${watchTasks.valid.length} valid task(s)`);
    debug(`${watchTasks.invalid.length} invalid task(s)`);

    /**
     * Get 'before' task list
     */
    const beforeTasksAsCliInput = resolveBeforeTasks(ctx.input, watchTasks.valid);

    debug(`Combined global + task specific 'before' tasks [${beforeTasksAsCliInput}]`);

    /**
     * Now Resolve the before task names given in input.
     */
    const beforeTasks = resolveTasks(beforeTasksAsCliInput, ctx);

    /**
     * Create runners for watch tasks;
     */
    const runners = createRunners(watchTasks, ctx);

    /**
     * Check if the user intends to handle running the tasks themselves,
     * if that's the case we give them the resolved tasks along with
     * the sequence and the primed runner
     */
    if (config.handoff) {
        debug(`Handing off Watchers`);
        return {tasks: watchTasks, beforeTasks, runners};
    }

    debug(`Not handing off, will handle watching internally`);

    /**
     * Never continue if any tasks were flagged as
     */
    if (watchTasks.invalid.length) {
        reporter.reportWatchTaskErrors(watchTasks.all, cli, input);
        return;
    }

    /**
     * Never continue if any of the BEFORE tasks were flagged as invalid
     */
    if (beforeTasks.invalid.length) {
        reporter.reportBeforeWatchTaskErrors(watchTasks, ctx);
        return;
    }

    /**
     * Never continue if any runners are invalid
     */
    if (runners.invalid.length) {
        runners.all.forEach(runner => reportWatchTaskTasksErrors(runner._tasks.all, runner.tasks, runner, config));
        return;
    }

    const beforeSequence = createFlattenedSequence(beforeTasks.valid, ctx);
    const beforeRunner   = createRunner(beforeSequence, ctx);
    /**
     * Report task list that's about to run
     */
    reportTaskList(beforeSequence, cli, input, config);
    const before$ = beforeRunner.series().share();

    /**
     * A generic timestamp to mark the beginning of the tasks
     * @type {number}
     */
    const timestamp = new Date().getTime();

    before$.subscribeOnError(x => {
        console.log('ERRROR');
    });

    before$.subscribeOnCompleted(_ => {

        reportSummary(beforeSequence, cli, input, config, new Date().getTime() - timestamp);

        runWatchers(runners.valid, ctx)
            .subscribe((watchEvent: WatchEvent) => {
                reportSummary(watchEvent.runner._sequence, cli, input, config, watchEvent.duration);
            });
    });

    // todo: start watchers
}

function runWatchers (runners, ctx) {

    const watchersAsObservables$ = getWatcherObservables(runners, ctx);
    return Rx.Observable
        .merge(watchersAsObservables$)
        .flatMap((watchEvent: WatchEvent) => {
            return Rx.Observable.create(obs => {

                const timestamp = new Date().getTime();

                watchEvent.runner._runner
                    .series()
                    .subscribe(x => {

                    }, e => {
                        //console.log('ERROR', e);
                    }, _ => {
                        //console.log('done', watchEvent.tasks);
                        watchEvent.duration = new Date().getTime() - timestamp;
                        obs.onNext(watchEvent);
                        obs.onCompleted();
                    });
            });
        });
}

function getWatcherObservables (runners, ctx) {
    return runners.map(runner => {
        return Rx.Observable.create(obs => {
            debug(`+ [id:${runner.watcherUID}] ${runner.patterns.length} patterns (${runner.patterns})`);
            debug(` - ${runner.tasks.length} tasks (${runner.tasks})`);
            const watcher = chokidar.watch(runner.patterns, runner.options)
                .on('all', function (event, path) {
                    obs.onNext(<WatchEvent>{
                        event:      event,
                        path:       path,
                        runner:     runner,
                        watcherUID: runner.watcherUID,
                        duration: 0
                    });
                });
            watcher.on('ready', () => {
                debug(`√ [id:${runner.watcherUID}] watcher ready (${runner.patterns})`);
                if (Object.keys(watcher.getWatched()).length === 0) {
                    reportNoFilesMatched(runner);
                }
            });
            return () => {
                debug(`- for ${runner.patterns}`);
                watcher.close();
            }
        });
    })
}

function getContext(ctx: WatchTrigger): WatchTrigger {
    /**
     * First, unwrap each item. If it has a <pattern> -> <task> syntax
     * then we split it, otherwise just return empty arrays for
     * both patterns and tasks
     */
    const unwrapped = ctx.cli.input.slice(1).map(unwrapShorthand);

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
    const moddedCtx = <WatchTrigger>merge({}, ctx, {
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

            subject._sequence = createFlattenedSequence(tasks.valid, ctx);
            subject._runner   = createRunner(subject._sequence, ctx);

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
