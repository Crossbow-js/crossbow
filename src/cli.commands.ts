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

{bold:Run Options:}

${optionsList(_.merge({}, require('../opts/command.run.opts.json'), require(runcommon)))}

{bold:Global Options:}

${optionsList(_.merge({}, require(globalcommon), require(common)))}

{bold:Example: run 2 named tasks in parallel} 

    $ crossbow run task1 task2 -p

{bold:Example: use a config file from another folder} 

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

{bold:Watch Options:}

${twoColFromJson(_.merge({}, require('../opts/command.watch.opts.json'), require('../opts/run-common.json')), 'desc')}

{bold:Global Options:}

${twoColFromJson(_.merge({}, require(globalcommon), require(common)), 'desc')}

{bold:Example: run 2 named tasks in parallel} 

    $ crossbow run task1 task2 -p

{bold:Example: use a config file from another folder} 

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

{bold:Options:}

${twoColFromJson(_.merge({}, require(globalcommon), require(common)), 'desc')}

{bold:Example: show all available tasks} 

    $ crossbow tasks

{bold:Example: show all tasks different config file} 

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
        help: `Usage: crossbow watchers [OPTIONS]
        
{bold:Options:} 

${twoColFromJson(_.merge({}, require(globalcommon)), 'desc')}

{bold:Example: Show watchers from a config file}

    $ crossbow watchers -c conf/config.js
`
    },

    init: {
        alias: ['init', 'i'],
        description: 'Create a configuration file',
        opts: [
            '../opts/command.init.opts.json',
            globalcommon
        ],
        help: `Usage: crossbow init [OPTIONS]

{bold:Init Options:}

${twoColFromJson(_.merge({}, require('../opts/command.init.opts.json')), 'desc')}

{bold:Options:}

${twoColFromJson(_.merge({}, require(globalcommon)), 'desc')}

{bold:Examples: Create a config file in default format (yaml)}

    $ crossbow init

{bold:Examples: Create a config file in JSON format}

    $ crossbow init --type json
`
    },

    docs: {
        alias: ['docs'],
        description: 'Generate documentation automatically',
        opts: [
            '../opts/command.docs.opts.json',
            globalcommon
        ],
        help: `Usage: crossbow docs [OPTIONS]

{bold:Docs Options:}

${twoColFromJson(_.merge({}, require('../opts/command.docs.opts.json')), 'desc')}

{bold:Options:}

${twoColFromJson(_.merge({}, require(globalcommon)), 'desc')}

{bold:Examples: Create a config file in default format (yaml)}

    $ crossbow init

{bold:Examples: Create a config file in JSON format}

    $ crossbow init --type json
`
    }
};

function optionsList (obj) {
    return twoColFromJson(obj, 'desc', function (key, subject) {
        const open = '--' + key;
        if (subject.alias && subject.alias.length) {
            return [open, ', ', ...subject.alias.map(x => '-' + x).join(', ')].join('')
        }
        return open;
    })
}

export function twoColFromJson(json, rightSidePropertyName: string, leftside?: Function) {
    if (!leftside) leftside = (subject) => subject;
    const cols = Object.keys(json).map(function(key) {
        const subject = json[key];
        return [leftside(key, subject), json[key][rightSidePropertyName]]
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
        return acc.concat('    ' + item.join('  '));
    }, []).join('\n');
}