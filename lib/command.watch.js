var exists = require('fs').existsSync;
var resolve = require('path').resolve;
var runCommand = require('./command.run.js');
var cli = require('../');
var logger = require('./logger');
var getBsConfig = require('./utils').getBsConfig;
var arrayify = require('./utils').arrarify;
var getPresentableTaskList = require('./utils').getPresentableTaskList;
var gatherTasks = require('./gather-watch-tasks');
var Rx = require('rx');
var createContext = require("./ctx");
var taskResolver;

module.exports = function (cli, input, config, cb) {
    var beforeTasks = input.crossbow.watch.before || [];
    return runWatcher(cli, input, config, cb);
};

/**
 * @param cli
 * @param input
 */
function runWatcher(cli, input, config, cb) {

    var crossbow = input.crossbow;
    var cliInput = cli.input.slice(1);
    var tasks = gatherTasks(crossbow, cliInput);
    var bsConfig = getBsConfig(crossbow, input);
    var watchConfig = { ignoreInitial: true };
    var ctx = createContext(input);

    ctx.trigger = {
        type: "watcher",
        cli: cli,
        input: input,
        config: config
    };

    taskResolver = require('./tasks')(crossbow, config);

    if (!cliInput.length) {
        if (tasks['default']) {
            processInput([tasks['default']]);
        } else {
            throw new Error('No watch targets given and no `default` found');
        }
    } else {

        var keys = Object.keys(tasks);
        var matching = cliInput.filter(function (x) {
            return keys.indexOf(x) > -1;
        });
        if (matching.length !== cliInput.length && config.get('strict')) {
            throw new Error('You tried to run the watch tasks `' + cliInput.join(', ') + '`' + ' but only  `' + matching.join(' ') + '` were found in your config.');
        }
        var tsk = matching.reduce(function (all, item) {
            return all.concat(tasks[item]);
        }, []);
        processInput(tsk);
    }

    function processInput(tasks) {

        var bs = require('browser-sync').create();

        bsConfig.files = bsConfig.files || [];

        bsConfig.logPrefix = function () {
            return this.compile(logger.prefix);
        };

        bsConfig.logFileChanges = false;

        bsConfig.files = bsConfig.files.concat(tasks.map(function (task, i) {

            console.log(splitTasks(task.tasks));
            return {
                options: task.options || watchConfig,
                match: task.patterns,
                fn: runCommandAfterWatch.bind(bs, task, splitTasks(task.tasks))
            };
        }));

        bs.init(bsConfig, function (err, bs) {
            if (err) {
                throw err;
            }
        });
    }

    /**
     * split [css, bs:reload] into
     *  {bsTasks: [], valid: []}
     * @param tasks
     * @returns {*|Observable|{bsTasks: Array, valid: Array}|Rx.Observable<T>|Rx.Observable<{bsTasks: Array, valid: Array}>}
     */
    function splitTasks(tasks) {
        return tasks.reduce(function (all, item) {
            if (item.match(/^bs:/)) {
                var split = item.split(':');
                all.bsTasks.push({ method: split[1], args: split.slice(2) });
            } else {
                all.valid.push(item);
            }
            return all;
        }, { bsTasks: [], valid: [] });
    }

    /**
     * @param taskItem
     * @param event
     * @param file
     * @returns {*}
     */
    function runCommandAfterWatch(taskItem, tasks, event, file) {

        var bs = this;

        if (event !== 'change' || taskItem.locked) {
            return;
        }

        var start = new Date().getTime();

        taskItem.locked = true;
        input.handoff = true;

        ctx.trigger.file = file;

        var runner = taskResolver.getRunner(tasks.valid, ctx);
        var errored = false;

        /**
         * Here we swallow errors on their way through and log them to the
         * console + browser.
         * We return an empty Observable to allow the task that caused
         * the error to 'complete', whilst not actually halting the stream
         */
        function logIncomingErrors(e) {
            if (!e.silent) {
                console.log(e);
                bs.notify('<span style="color: red; display: block; text-align: left">Error from task ' + e.task.taskName + '</span><span style="text-align: left!important; display: block; width: 100%;">' + e + '</span>', 5000);
            }
            errored = true;
            return Rx.Observable.empty(); // continue through so this sequence does not stop
        }

        /**
         * If a task calls onNext, we'll receive that here
         * @param {*} x
         */
        function handleValueReceived(x) {
            logger.info('got a value', x);
        }

        /**
         * Log errors to the console
         * @param {Error} e
         */
        function handleIncomingError(e) {
            taskItem.locked = false;
            console.log(e.stack);
        }

        /**
         * The task completed, with possible errors
         */
        function handleTaskCompleted() {
            if (errored) {
                taskItem.locked = false;
                return;
            }

            if (tasks.bsTasks.length) {
                runBsTasks(tasks.bsTasks);
            }

            logger.info('{ok: } Completed in {cyan:' + String(new Date().getTime() - start) + 'ms');

            if (runner.tasks.valid.length) {
                logTasks(runner.tasks.valid, config.get('summary') === 'short');
            } else {
                logger.info('{ok: } {yellow:' + tasks.bsTasks.map(function (x) {
                    return 'Browsersync: ' + x.method;
                }).join('-'));
            }

            taskItem.locked = false;
            cb(null, runner);
        }

        /**
         *
         */
        function runBsTasks(bsTasks) {
            if (bsTasks.length) {
                bsTasks.forEach(function (task) {
                    if (typeof bs[task.method] === 'function') {
                        if (task.args.length) {
                            bs[task.method].apply(bs, task.args);
                        } else {
                            bs[task.method].call(bs);
                        }
                    }
                });
            }
        }

        runner.run['catch'](logIncomingErrors).subscribe(handleValueReceived, handleIncomingError, handleTaskCompleted);
    }
}

function logSubTasks(tasks) {
    tasks.forEach(function (task) {
        logger.info('{gray:- ' + task.taskName);
        if (task.tasks.length) {
            logSubTasks(task.tasks);
        }
    });
}

function logTasks(tasks, short) {
    tasks.forEach(function (task) {
        logger.info('{ok: } {yellow:' + task.taskName);
        if (task.tasks.length && !short) {
            logSubTasks(task.tasks);
        }
    });
}