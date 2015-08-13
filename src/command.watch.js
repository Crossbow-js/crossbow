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
var taskResolver;

module.exports = function (cli, opts, trigger) {
    var beforeTasks   = opts.crossbow.watch.before || [];
    return runWatcher(cli, opts, trigger);
};

/**
 * @param cli
 * @param input
 */
function runWatcher (cli, input, trigger) {

    var crossbow    = input.crossbow;
    var cliInput    = cli.input.slice(1);
    var tasks       = gatherTasks(crossbow, cliInput);
    var bsConfig    = getBsConfig(crossbow, input);
    var watchConfig = {ignoreInitial: true};
    var config      = trigger.config;

    taskResolver    = require('./tasks')(crossbow, config);

    if (!cliInput.length) {
        if (tasks['default']) {
            processInput([tasks['default']]);
        } else {
            throw new Error('No watch targets given and no `default` found');
        }
    } else {

        var keys = Object.keys(tasks);
        var matching = cliInput.filter(x => keys.indexOf(x) > -1);
        if (matching.length !== cliInput.length && config.get('strict')) {
            throw new Error('You tried to run the watch tasks `' + cliInput.join(', ') + '`' +
                ' but only  `' + matching.join(' ') + '` were found in your config.');
        }
        var tsk = matching.reduce((all, item) => {
            return all.concat(tasks[item]);
        }, []);
        processInput(tsk);
    }

    function processInput (tasks) {

        var bs = require('browser-sync').create();

        bsConfig.files  = bsConfig.files || [];

        bsConfig.logPrefix = function () {
            return this.compile(logger.prefix);
        };

        bsConfig.logFileChanges = false;

        bsConfig.files = bsConfig.files.concat(tasks.map(function (task, i) {
            return {
                options: task.options || watchConfig,
                match: task.patterns,
                fn: runCommandAfterWatch.bind(bs, task, input)
            };
        }));

        bs.init(bsConfig, function (err, bs) {
            //console.log('running');
            //opts.cb(null, {
            //    bsConfig: bsConfig,
            //    tasks: tasks,
            //    bs: bs,
            //    opts: opts
            //});
        });
    }

    /**
     * @param task
     * @param opts
     * @param event
     * @param file
     * @returns {*}
     */
    function runCommandAfterWatch (task, opts, event, file, cb) {

        var bs = this;

        if (event !== 'change' || task.locked) {
            return;
        }

        cb = cb || function () {};

        var start = new Date().getTime();
        var crossbow = opts.crossbow;

        var bstest = x => x.match(/^bs:(.+)/);

        var bsTasks = task.tasks
            .filter(bstest)
            .map(x => x.split(":"))
            .map(x => {
                return {
                    method: x[1],
                    args: x.slice(2)
                }
            });

        var valid = task.tasks.filter(x => !bstest(x));

        task.locked = true;
        opts.handoff = true;

        input.ctx.trigger = {
            task: task,
            event: event,
            file: file,
            opts: opts,
            filepath: resolve(opts.cwd, file),
            type: 'watcher',
        };

        var runner = taskResolver.getRunner(valid, input.ctx);
        var errored = false;

        runner
            .run
            .catch(e => {
                console.error(e);
                errored = true;
                return Rx.Observable.empty(); // continue through so this sequence does not stop
            }).subscribe(
                x => {
                    logger.info('got a value', x);
                },
                e => {
                    task.locked = false;
                    console.log(e.stack);
                },
                s => {
                    if (errored) {
                        task.locked = false;
                        return;
                    }
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

                    logger.info('{ok: } Completed in {cyan:' + String(new Date().getTime() - start) + 'ms');
                    var short = config.get('summary') === 'short';
                    if (runner.tasks.valid.length) {
                        logTasks(runner.tasks.valid);
                    } else {
                        logger.info('{ok: } {yellow:' + bsTasks.map(x => 'Browsersync: ' + x.method).join('-'));
                    }

                    function logSubTasks (tasks) {
                        tasks.forEach(function (task) {
                            logger.info('{gray:- ' + task.taskName);
                            if (task.tasks.length) {
                                logSubTasks(task.tasks);
                            }
                        });
                    }

                    function logTasks (tasks) {
                        tasks.forEach(function (task) {
                            logger.info('{ok: } {yellow:' + task.taskName);
                            if (task.tasks.length && !short) {
                                logSubTasks(task.tasks);
                            }
                        });
                    }
                    task.locked = false;
                }
            );
    }
}