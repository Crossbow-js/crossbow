/// <reference path="../typings/main.d.ts" />
import {CommandTrigger} from './command.run';
import {CrossbowConfiguration} from './config';
import {reportTree, reportTaskErrors} from './reporters/defaultReporter';
import {CrossbowInput, Meow} from './index';
import {resolveWatchTasks} from './watch.resolve';

const merge = require('lodash.merge');

export interface WatchTrigger extends CommandTrigger {
    type: 'watcher'
}

export default function execute (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration): void {
    const ctx: WatchTrigger = {cli, input, config, type: 'watcher'};
    const moddedCtx = getNextContext(ctx);

    /**
     * First Resolve the task names given in input.
     */
    const tasks = resolveWatchTasks(moddedCtx.cli.input, moddedCtx);
    console.log(tasks);
}

function getNextContext(ctx: WatchTrigger): WatchTrigger {
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

/**
 * take the following:
 *  $ crossbow watch "*.js -> (lint) (unit)"
 *
 *  and convert it into
 *  patterns: ["*.js"]
 *  tasks: ["lint", "unit"]
 */
export function unwrapShorthand(incoming, i) {
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
    return {name: incoming, i, patterns, tasks}
}

export function handleIncomingWatchCommand (cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) {
    execute(cli, input, config);
}
