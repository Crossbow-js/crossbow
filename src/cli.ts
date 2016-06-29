import {commands, CLICommands} from "./cli.commands";
const _ = require('../lodash.custom');

import parse from './cli.parse';



export default function (cb) {

    const args          = process.argv.slice(2);
    const command       = args[0];
    const match         = getCommand(command, commands);

    if (match.length) {
        console.log('Got a match', match);
        const opts = _.merge({}, ...commands[match[0]].opts.map(require));
        const cli  = parse(args, opts);
        cb(cli);
    } else {
        console.log('Show help, no match');
    }
}

export function getCommand(incoming: string, commands: CLICommands): string[] {

    return Object.keys(commands).reduce(function (acc, item) {

        const selected = commands[item];

        /**
         * A direct match - this means the typed command matches
         * an command name exactly.
         *
         * eg:
         *  $ crossbow run
         *
         * -> ['run']
         */
        if (item === incoming) {
            return acc.concat(item);
        }

        /**
         * An alias match is when a short-hand command was given
         * and it existed in the 'alias' array for a command.
         *
         * eg:
         *
         *  $ crossbow run
         *
         * commands:
         *
         * run: { alias:['run', 'r'] }
         *
         * -> ['run']
         *
         */
        if (selected.alias && selected.alias.indexOf(incoming) > -1) {
            return acc.concat(item);
        }

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
