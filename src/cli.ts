import {CliFlagTypes} from "./cli.parse";
const merge = require('../lodash.custom').merge;
const common = require('../opts/common.json');
const runcommon = require('../opts/run-common.json');
const globalcommon = require('../opts/global-common.json');
import parse from './cli.parse';

export enum CLICommands {
    // Run command
    run = <any>"run",
    r = <any>"r",

    // Watch command
    watch = <any>"watch",
    w = <any>"w",

    // Tasks command
    tasks = <any>"tasks",
    t = <any>"t",
    ls = <any>"ls",

    watchers = <any>"watchers",
    init = <any>"init",

    docs = <any>"docs",
}

export default function (cb) {
    // var yargs  = require("yargs")
    //     .command(CLICommands.run, "Run a task(s) [r]")
    //     .command(CLICommands.watch, "Run a watcher(s) [w]")
    //     .command(CLICommands.tasks, "See your available top-level tasks [ls, t]")
    //     .command(CLICommands.docs, "Generate documentation automatically")
    //     .command(CLICommands.watchers, "See your available watchers")
    //     .command(CLICommands.init, "Create a configuration file")
    //     .version(function () {
    //         return require('../package.json').version;
    //     })
    //     .example("$0 run task1 task2", "Run 2 tasks in sequence")
    //     .example("$0 tasks", "List your available tasks")
    //     .epilogue("For help running a certain command, type <command> --help\neg: $0 run --help");

    // var argv    = yargs.argv;
    // var command = argv._[0];
    const args = process.argv.slice(2);
    const command = args[0];
    const opts = merge({}, common, globalcommon, runcommon);
    const cli = parse(args, opts);

    console.log(cli);
    cb(cli);
    // var valid   = Object.keys(CLICommands);

    // if (valid.indexOf(cli.command) > -1) {
    //     handleIncoming(cli.command, cli.flags, cb);
    // } else {
    //     console.log('Show help');
    // }
}

function handleIncoming(command, yargs, cb) {
    let out;
    if (command === CLICommands.run ||
        command === CLICommands.r
    ) {
        const opts = merge({}, require('../opts/command.run.opts.json'), runcommon, common);
        out = yargs
            .usage("Usage: $0 run [tasknames..]")
            .options(opts)
            .example("$0 run task1 task2 task3", "Run 3 tasks in sequence")
            .example("$0 run task1 task2 -p", "Run 2 tasks in parallel")
            .example("$0 run -i", "Run in interactive mode (aso you can select tasks")
            .example("$0 run some-task -c .cb.yaml", "Run 'some-task' as defined in a configuration file")
            .help()
            .argv;
    }
    if (command === CLICommands.watch ||
        command === CLICommands.w
    ) {
        const opts = merge({}, require('../opts/command.watch.opts.json'), runcommon, common);
        out = yargs
            .usage("Usage: $0 watch [watchers..]")
            .options(opts)
            .example("$0 watch default docker", "Run 2 watchers (default+docker)")
            .example("$0 watch", "Runs the 'default' watcher if available")
            .example("$0 watch -i", "Choose a watcher interactively")
            .example("$0 watch '*.js -> @npm webpack'", "Use the short hand watch syntax")
            .help()
            .argv;
    }
    if (command === CLICommands.tasks ||
        command === CLICommands.ls
    ) {
        const opts = merge({}, require('../opts/command.tasks.opts.json'), common, globalcommon);
        out = yargs
            .usage("Usage: $0 tasks\nShows a list of top-level task names that can be run")
            .options(opts)
            .example("$0 tasks", "Shows tasks with minimal info")
            .example("$0 tasks -v", "Shows tasks with maximum info")
            .help()
            .argv;
    }
    if (command === CLICommands.watchers) {
        const opts = merge({}, require('../opts/command.watchers.opts.json'), globalcommon);
        out = yargs
            .usage("Usage: $0 tasks\nShows a list of top-level task names that can be run")
            .options(opts)
            .example("$0 watchers", "Show available Watchers")
            .example("$0 watchers -v", "Shows tasks with maximum info")
            .help()
            .argv;
    }
    if (command === CLICommands.init) {
        const opts = merge({}, require('../opts/command.init.opts.json'), globalcommon);
        out = yargs
            .usage("Usage: $0 init")
            .options(opts)
            .example("$0 init", "Creates the default crossbow.yaml file")
            .example("$0 init --type cbfile", "Create a 'cbfile.js'")
            .example("$0 init --type js", "Create a module.exports style config")
            .help()
            .argv;
    }
    if (command === CLICommands.docs) {
        const opts = merge({}, require('../opts/command.docs.opts.json'), globalcommon);
        out = yargs
            .usage("Usage: $0 docs")
            .options(merge({}, opts))
            .example("$0 docs", "Add docs to README.md in cwd")
            .example("$0 docs --output myfile.md", "CREATE myfile.md in cwd")
            .example("$0 docs --file myfile", "ADD TO myfile.md in cwd")
            .help()
            .argv;
    }
    cb({flags: stripUndefined(out), input: out._});
}

/**
 * Incoming undefined values are problematic as
 * they interfere with Immutable.Map.mergeDeep
 * @param subject
 * @returns {*}
 */
function stripUndefined (subject) {
    return Object.keys(subject).reduce(function (acc, key) {
        if (key === '_') {
            return acc;
        }
        var value = subject[key];
        if (typeof value === "undefined") {
            return acc;
        }
        acc[key] = value;
        return acc;
    }, {});
}
