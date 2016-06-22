const _ = require('../lodash.custom');
const common = '../opts/common.json';
const runcommon = '../opts/run-common.json';
const globalcommon = '../opts/global-common.json';
import parse from './cli.parse';

export const CLICommands  = {

    run: {
        alias: ['run', 'r'],
        description: 'Run a task(s)',
        opts: [
            '../opts/command.run.opts.json',
            runcommon,
            globalcommon,
            common,
        ]
    },

    watch: {
        alias: ["watch", "w"],
        description: 'Run a watcher(s)',
        opts: [
            '../opts/command.watch.opts.json',
            runcommon,
            common
        ]
    },

    tasks: {
        alias: ["tasks", "t", "ls"],
        description: 'See your available top-level tasks',
        opts: [
            '../opts/command.tasks.opts.json',
            common,
            globalcommon
        ]
    },

    watchers: {
        alias: ['watchers'],
        description: 'See your available watchers',
        opts: [
            '../opts/command.watchers.opts.json',
            globalcommon
        ]
    },

    init: {
        alias: ['init', 'i'],
        description: 'Create a configuration file',
        opts: [
            '../opts/command.init.opts.json',
            globalcommon
        ]
    },

    docs: {
        alias: ['docs'],
        description: 'Generate documentation automatically',
        opts: [
            '../opts/command.docs.opts.json',
            globalcommon
        ]
    }
};

export default function (cb) {

    const args          = process.argv.slice(2);
    const command       = args[0];
    const match         = getCommand(command);

    if (match.length) {
        // console.log('Got a match', match);
        const opts = _.merge({}, ...CLICommands[match[0]].opts.map(require));
        const cli = parse(args, opts);
        cb(cli);
    } else {
        console.log('Show help, no match');
    }
}

export function getCommand(incoming) {
    return Object.keys(CLICommands).reduce(function (acc, item) {

        const selected = CLICommands[item];

        // direct match
        if (item === incoming) return acc.concat(item);

        if (selected.alias && selected.alias.indexOf(incoming) > -1) return acc.concat(item);

        return acc;
    }, []);
}

// function handleIncoming(command, yargs, cb) {
//             .example("$0 run task1 task2 task3", "Run 3 tasks in sequence")
//             .example("$0 run task1 task2 -p", "Run 2 tasks in parallel")
//             .example("$0 run -i", "Run in interactive mode (aso you can select tasks")
//             .example("$0 run some-task -c .cb.yaml", "Run 'some-task' as defined in a configuration file")

//             .example("$0 watch default docker", "Run 2 watchers (default+docker)")
//             .example("$0 watch", "Runs the 'default' watcher if available")
//             .example("$0 watch -i", "Choose a watcher interactively")
//             .example("$0 watch '*.js -> @npm webpack'", "Use the short hand watch syntax")

//             .example("$0 tasks", "Shows tasks with minimal info")
//             .example("$0 tasks -v", "Shows tasks with maximum info")

//             .example("$0 watchers", "Show available Watchers")
//             .example("$0 watchers -v", "Shows tasks with maximum info")

//             .example("$0 init", "Creates the default crossbow.yaml file")
//             .example("$0 init --type cbfile", "Create a 'cbfile.js'")
//             .example("$0 init --type js", "Create a module.exports style config")

//             .example("$0 docs", "Add docs to README.md in cwd")
//             .example("$0 docs --output myfile.md", "CREATE myfile.md in cwd")
//             .example("$0 docs --file myfile", "ADD TO myfile.md in cwd")
