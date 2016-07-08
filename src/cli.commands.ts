import {twoCol} from "./reporters/task.list";
import {log} from "debug/node";
const _ = require('../lodash.custom');
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

Run Options:
${twoColFromJson(_.merge({}, require('../opts/command.run.opts.json'), require(runcommon)))}

Global Options:
${twoColFromJson(_.merge({}, require(globalcommon), require(common)))}

Example: run 2 named tasks in parallel 
    $ crossbow run task1 task2 -p

Example: use a config file from another folder 
    $ crossbow run <task-name> -c .conf/crossbow.yaml
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
        help: `Usage: crossbow watch [...watcher] [OPTIONS]

Watch Options:
${twoColFromJson(_.merge({}, require('../opts/command.watch.opts.json'), require('../opts/run-common.json')))}

Global Options:
${twoColFromJson(_.merge({}, require(globalcommon), require(common)))}

Example: run 2 named tasks in parallel 
    $ crossbow run task1 task2 -p

Example: use a config file from another folder 
    $ crossbow run <task-name> -c .conf/crossbow.yaml
    `
    },

    tasks: {
        alias: ["tasks", "t", "ls"],
        description: 'See your available top-level tasks',
        opts: [
            '../opts/command.tasks.opts.json',
            common,
            globalcommon
        ],
        help: `Usage: crossbow tasks [OPTIONS]

Options:
${twoColFromJson(_.merge({}, require(globalcommon), require(common)))}

Example: show all available tasks 
    $ crossbow tasks

Example: show all tasks different config file 
    $ crossbow tasks -c conf/config.js
    `
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

function twoColFromJson(json) {
    const cols = Object.keys(json).map(function(key) {
        const subject = json[key];
        const leftSide = (function () {
            const open = '--' + key;
            if (subject.alias && subject.alias.length) {
                return [open, ', ', ...subject.alias.map(x => '-' + x).join(', ')].join('')
            }
            return open;
        })();
        return [leftSide, json[key].desc]
    });
    const longest = cols.reduce(function (acc, item) {
        if (item[0].length > acc) return item[0].length;
        return acc;
    }, 0);
    const padded = cols.map(function (tuple) {
        if (tuple[0].length < longest) {
            return [tuple[0] + new Array(longest - tuple[0].length).join(' ') + ' ', tuple[1]];
        }
        return tuple;
    });
    return padded.reduce(function (acc, item) {
        return acc.concat('  ' + item.join('  '));
    }, []).join('\n');
}