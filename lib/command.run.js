var prom = require('prom-seq');
var resolve = require('path').resolve;
var basename = require('path').basename;
var objPath = require('object-path');
var logger = require('./logger');
var copy = require('./command.copy');
var fs = require('fs');
var Rx = require('rx');
var exists = Rx.Observable.fromNodeCallback(fs.exists);
var utils = require('./utils');
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

    var cliInput = cli.input.slice(1);
    var crossbow = input.crossbow || {};
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

    runner.run.subscribe(function (x) {
        logger.debug('got a value', x);
    }, function (e) {
        console.log(e.stack.split('\n').slice(0, 2).join('\n'));
    }, function (s) {
        handleCompletion(runner.tasks.valid);
        cb(null, runner);
    });

    /**
     * Logging for task completion
     */
    function handleCompletion(tasks) {

        function logTask(tasks) {
            tasks.forEach(function (task) {
                logger.info('{gray:- %s', task.taskName);
                if (task.tasks.length) {
                    logTask(task.tasks);
                }
            });
        }

        var short = config.get('summary') === 'short';

        tasks.forEach(function (task) {
            logger.info('{ok: } {cyan:%s', task.taskName);
            if (short) {
                return;
            }

            if (task.tasks.length) {
                logTask(task.tasks);
            }
        });
    }

    /**
     * Run each function as quickly as possible
     * Don't wait for previous ones to complete
     * @param {Array} items - functions to call
     */
    function runInParallel(items) {

        Rx.Observable.forkJoin.apply(null, items).subscribe(function (x) {
            console.log(x);
        }, function (e) {
            return cb(e);
        }, function (s) {
            cb(null, { tasks: tasks, runSequence: seq, sequence: sequence });
        });
    }
};