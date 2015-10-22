var prom          = require('prom-seq');
var resolve       = require('path').resolve;
var basename      = require('path').basename;
var objPath       = require('object-path');
var logger        = require('./logger');
var fs            = require('fs');
var Rx            = require('rx');
var exists        = Rx.Observable.fromNodeCallback(fs.exists);
var utils         = require('./utils');
var createContext = require("./ctx");
var taskResolver;
var tasks;

/**
 * @param {{input: Array, flags: Object}} cli - raw input from meow
 * @param {Object} input
 * @param {Immutable.Map} config
 * @param {Function} [cb]
 */
module.exports = function (cli, input, config, cb) {

    var cliInput   = cli.input.slice(1);
    var crossbow   = input.crossbow || {};
    crossbow.tasks = crossbow.tasks || {};

    var ctx = createContext(input);

    ctx.trigger = {
        type: "command",
        cli: cli,
        input: input,
        config: config
    };

    taskResolver = require('./tasks')(crossbow, config);

    var runner = taskResolver.getRunner(cliInput, ctx);

    if (config.get('handoff')) {
        return runner;
    } else {
        if (runner.tasks.invalid.length) {
            throw new TypeError([
                'Invalid tasks:',
                runner.tasks.invalid.map((x, i) => ' ' + String(i + 1) + ' ' + x.taskName).join('\n'),
                '',
                'Please check for typos/missing files etc'
            ].join('\n'));
        }
    }

    runner
        .run
        .subscribe(
            x => {
                logger.debug('got a value', x);
            },
            e => {
                console.log(e);
                cb(e);
            },
            s => {
                handleCompletion(runner.tasks.valid, runner.sequence);
                cb(null, runner);
            }
    );


    /**
     * Logging for task completion
     */
    function handleCompletion(tasks, sequence) {

        function logTask(tasks) {
            tasks.forEach(function (task) {
                logger.info('{gray:- %s', task.taskName);
                if (task.tasks.length) {
                    logTask(task.tasks);
                }
            });
        }

        var short = config.get('summary') === 'short';

        var totalTime = sequence.reduce(function (all, seq) {
            return seq.seq.taskItems.reduce(function (all, task, i) {
                return all + task.duration;
                //logger.info('{gray: %s:} %sms ', i + 1, task.duration);
            }, 0);
        }, []);

        var logTasks = sequence.reduce(function (all, seq) {

            var output = [{
                level: "info",
                msgs: [
                    ["{ok: } {cyan:%s}", seq.task.taskName]
                ]
            }];

            if (short) {
                return all.concat(output);
            }

            return all.concat(output.concat({
                level: "info",
                msgs: seq.seq.taskItems.map(function (task, i) {
                    return ["{gray:%s:} %sms", i + 1, task.duration];
                }, [])
            }));
        }, []);

        logTasks.forEach(function (log) {
            log.msgs.forEach(function (item) {
                logger[log.level].apply(logger, item);
            });
        });

        var short = config.get('summary') === 'short';
    }

    /**
     * Run each function as quickly as possible
     * Don't wait for previous ones to complete
     * @param {Array} items - functions to call
     */
    function runInParallel(items) {

        Rx.Observable
            .forkJoin
            .apply(null, items)
            .subscribe(
                x => {
                    console.log(x);
                },
                e => cb(e),
                s => {
                    cb(null, {tasks, runSequence: seq, sequence: sequence});
                }
            );
    }
};