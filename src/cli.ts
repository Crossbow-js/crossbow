const merge = require('../lodash.custom').merge;
var common = require('../opts/common.json');
var pkg    = require('../package.json');

export default function (cb) {
    var yargs  = require("yargs")
        .command("run", "Run a task(s)")
        .command("watch", "Run a watcher(s)")
        .command("tree", "See your entire task tree")
        .command("tasks", "See your available top-level tasks")
        .command("init", "Create a configuration file")
        .command("init-cbfile", "Create a cbfile.js")
        .version(function () {
            return pkg.version;
        })
        .epilogue("For help running a certain command, type <command> --help\neg: $0 run --help");

    var argv    = yargs.argv;
    var command = argv._[0];
    var valid   = ["run", "watch", "tasks", "tree"];

    if (valid.indexOf(command) > -1) {
        handleIncoming(command, yargs.reset(), cb);
    } else {
        yargs.showHelp();
    }
}

function handleIncoming(command, yargs, cb) {
    let out;
    if (command === "run") {
        out = yargs
            .usage("Usage: $0 run [tasknames..]")
            .options(merge({}, common, require('../opts/command.run.opts.json')))
            .example("$0 run task1 task2 task3", "Run 3 tasks in sequence")
            .example("$0 run task1 task2 -p", "Run 2 tasks in parallel")
            .example("$0 run -i", "Run in interactive mode (aso you can select tasks")
            .example("$0 run some-task -c .cb.yaml", "Run 'some-task' as defined in a configuration file")
            .help()
            .argv;
    }
    if (command === "watch") {
        out = yargs
            .usage("Usage: $0 watch [watchers..]")
            .options(merge({}, common, require('../opts/command.watch.opts.json')))
            .example("$0 watch default docker", "Run 2 watchers (default+docker)")
            .example("$0 watch", "Runs the 'default' watcher if available")
            .example("$0 watch -i", "Choose a watcher interactively")
            .example("$0 watch '*.js -> @npm webpack'", "Use the short hand watch syntax")
            .help()
            .argv;
    }
    if (command === "tasks") {
        out = yargs
            .usage("Usage: $0 tasks\nShows a list of top-level task names that can be run")
            .options(merge({}, require('../opts/command.watch.opts.json')))
            .example("$0 tasks")
            .help()
            .argv;
    }
    if (command === "tree") {
        out = yargs
            .usage("Usage: $0 tree\nShow's all tasks and their children in a tree.")
            .options(merge({}, require('../opts/command.watch.opts.json')))
            .example("$0 tree", "Shows tasks with minimal info")
            .example("$0 tree -v", "Shows tasks with maximum info")
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