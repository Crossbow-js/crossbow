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
    var valid   = ["run", "watch"];

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