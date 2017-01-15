import {CommandTrigger} from "./command.run";

const merge = require("../lodash.custom").merge;
const assign = require("../lodash.custom").assign;

export interface UnwrappedTask {
    patterns: string[];
    tasks: string[];
    i: number;
    name: string;
}

export function getModifiedWatchContext(trigger: CommandTrigger): CommandTrigger {
    /**
     * First, unwrap each item. If it has a <pattern> -> <task> syntax
     * then we split it, otherwise just return empty arrays for
     * both patterns and tasks
     */
    const unwrapped = trigger.cli.input.slice(1).map(unwrapShorthand);

    /**
     * Next take any items that were split and
     * generate a fake watch options object
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

    trigger.input = merge({}, trigger.input, {
        watch: fakeWatchConfig
    });

    /**
     * Override the CLI input to include the newly split names
     * @type {*[]}
     */
    trigger.cli.input = unwrapped.map(x => x.name);

    return trigger;
}

/**
 * take the following:
 *  $ crossbow watch "*.js -> (lint) (unit)"
 *
 *  and convert it into
 *  patterns: ["*.js"]
 *  tasks: ["lint", "unit"]
 */
export function unwrapShorthand(incoming: string, i: number): UnwrappedTask {
    let patterns = [];
    let tasks = [];

    if (incoming.indexOf(" -> ") > -1) {
        const split = incoming.split(" -> ").map(x => x.trim());
        patterns = split[0].split(":");
        if (split[1]) {
            const _tasks = split[1].match(/\(.+?\)/g);
            if (_tasks) {
                tasks = _tasks.map(x => x.slice(1, -1).trim());
            } else {
                tasks = [split[1]];
            }
        }
        return {patterns, tasks, i, name: `_shorthand_${i}`};
    }
    return {patterns, tasks, i, name: incoming};
}
