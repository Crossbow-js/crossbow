var exists                  = require('fs').existsSync;
var resolve                 = require('path').resolve;
var runCommand              = require('./command.run.js');
var cli                     = require('../');
var logger                  = require('./logger');
var getBsConfig             = require('./utils').getBsConfig;
var arrayify                = require('./utils').arrarify;
var getPresentableTaskList  = require('./utils').getPresentableTaskList;
var gatherTasks             = require('./gather-watch-tasks');
var Rx                      = require('rx');
var createContext           = require("./ctx");
var watch                   = require("./watch");
var taskResolver;

module.exports = function (cli, input, config, cb) {
    var beforeTasks   = input.crossbow.watch.before || [];
    return runWatcher(cli, input, config, cb);
};

/**
 * @param cli
 * @param input
 */
function runWatcher (cli, input, config, cb) {

    var crossbow    = input.crossbow;
    var cliInput    = cli.input.slice(1);
    var tasks       = gatherTasks(crossbow, cliInput);
    var bsConfig    = getBsConfig(crossbow, input, config);
    var ctx         = createContext(input);
    var watcher     = watch(cli, tasks);
    var watchTasks  = watcher.getTasks(cliInput);
    var bs          = require('./bs')(bsConfig, watchTasks, runCommandAfterWatch);
    taskResolver    = require('./tasks')(crossbow, config);

    ctx.trigger = {
        type: "watcher",
        cli: cli,
        input: input,
        config: config
    };

    logger.debug('Running watcher with tasks', watchTasks);

    /**
     * @param taskItem
     * @param event
     * @param file
     * @returns {*}
     */
    function runCommandAfterWatch (taskItem, tasks, event, file) {

        var bs = this;

        if (event !== 'change' || taskItem.locked) {
            return;
        }

        var start  = new Date().getTime();

        taskItem.locked = true;
        input.handoff   = true;

        ctx.trigger.file = file;

        var runner = taskResolver.getRunner(tasks.valid, ctx);
        var errored = false;

        /**
         * Here we swallow errors on their way through and log them to the
         * console + browser.
         * We return an empty Observable to allow the task that caused
         * the error to 'complete', whilst not actually halting the stream
         */
        function logIncomingErrors (e) {
            if (!e.silent) {
                console.log(e);
                bs.notify(`<span style="color: red; display: block; text-align: left">Error from task ${e.task.taskName}</span><span style="text-align: left!important; display: block; width: 100%;">${e}</span>`, 5000);
            }
            errored = true;
            return Rx.Observable.empty(); // continue through so this sequence does not stop
        }

        /**
         * If a task calls onNext, we'll receive that here
         * @param {*} x
         */
        function handleValueReceived (x) {
            logger.info('got a value', x);
        }

        /**
         * Log errors to the console
         * @param {Error} e
         */
        function handleIncomingError (e) {
            taskItem.locked = false;
            console.log(e.stack);
        }

        /**
         * The task completed, with possible errors
         */
        function handleTaskCompleted () {
            if (errored) {
                taskItem.locked = false;
                return;
            }

            if (tasks.bsTasks.length) {
                bs.runPublicMethods(tasks.bsTasks);
            }

            logger.info('{ok: } Completed in {cyan:' + String(new Date().getTime() - start) + 'ms');

            if (runner.tasks.valid.length) {
                logTasks(runner.tasks.valid, config.get('summary') === 'short');
            } else {
                logger.info('{ok: } {yellow:' + tasks.bsTasks.map(x => 'Browsersync: ' + x.method).join('-'));
            }

            taskItem.locked = false;
            cb(null, runner);
        }

        runner.run
            .catch(logIncomingErrors)
            .subscribe(
                handleValueReceived,
                handleIncomingError,
                handleTaskCompleted
            );
    }
}

function logSubTasks (tasks) {
    tasks.forEach(function (task) {
        logger.info('{gray:- ' + task.taskName);
        if (task.tasks.length) {
            logSubTasks(task.tasks);
        }
    });
}

function logTasks (tasks, short) {
    tasks.forEach(function (task) {
        logger.info('{ok: } {yellow:' + task.taskName);
        if (task.tasks.length && !short) {
            logSubTasks(task.tasks);
        }
    });
}