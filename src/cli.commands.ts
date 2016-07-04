import {twoCol} from "./reporters/task.list";
export interface CommandOption {
    alias: string[],
    description: string,
    opts: string[]
    help: string
}

export interface CLICommands {
    [command: string]: CommandOption
}

const common       = '../opts/common.json';
const runcommon    = '../opts/run-common.json';
const globalcommon = '../opts/global-common.json';

function twoColFromJson(json) {
    const cols = Object.keys(json).map(function(key) {
        return [key, json[key].desc]
    });
    const longest = cols.reduce(function (acc, item) {
        if (item[0].length > acc) return item[0].length;
        return acc;
    }, 0);
    const padded = cols.map(function () {
        // todo padded lines
    });
    return 'cols';

}

export const commands: CLICommands = {

    run: {
        alias: ['run', 'r'],
        description: 'Run a task(s)',
        opts: [
            '../opts/command.run.opts.json',
            runcommon,
            globalcommon,
            common,
        ],
        help: `Usage: crossbow run [...tasks] [OPTIONS]
Options:
${twoColFromJson(require(runcommon))}
Example: run 2 named tasks in parallel 
    $ crossbow run task1 task2 -p

Example: run 1 named task, 1 inline task in order 
    $ crossbow run task1 '@npm webpack'
    `
    },

    watch: {
        alias: ["watch", "w"],
        description: 'Run a watcher(s)',
        opts: [
            '../opts/command.watch.opts.json',
            runcommon,
            common
        ],
        help: `Watch Help`
    },

    tasks: {
        alias: ["tasks", "t", "ls"],
        description: 'See your available top-level tasks',
        opts: [
            '../opts/command.tasks.opts.json',
            common,
            globalcommon
        ],
        help: `Tasks Help`
    },

    watchers: {
        alias: ['watchers'],
        description: 'See your available watchers',
        opts: [
            '../opts/command.watchers.opts.json',
            globalcommon
        ],
        help: `Watchers Help`
    },

    init: {
        alias: ['init', 'i'],
        description: 'Create a configuration file',
        opts: [
            '../opts/command.init.opts.json',
            globalcommon
        ],
        help: `Init Help`
    },

    docs: {
        alias: ['docs'],
        description: 'Generate documentation automatically',
        opts: [
            '../opts/command.docs.opts.json',
            globalcommon
        ],
        help: `docs help`
    }
};