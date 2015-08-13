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

/**
 * Get a customised prefixed logger per task
 * @param {String} name
 * @param {Number} maxLength
 * @returns {string}
 */
function getLogPrefix(name, maxLength) {
    var diff = maxLength - name.length;
    if (diff > 0) {
        return new Array(diff + 1).join(' ') + name;
    }
    return name.slice(0, maxLength - 1) + '~';
}

var taskResolver;
var tasks;

function getTaskSequence() {}

module.exports = function (cli, input, trigger) {

    var cliInput = cli.input.slice(1);
    var crossbow = input.crossbow || {};
    crossbow.tasks = crossbow.tasks || {};
    var config = trigger.config;
    var cb = config.get('cb');

    if (!cliInput.length) {
        logger.error('Please provide a command for {magenta:Crossbow} to run');
        return;
    }

    if (!input.ctx.trigger.type) {
        input.ctx.trigger = trigger;
    }

    if (!taskResolver) {
        taskResolver = require('./tasks')(crossbow, config);
        tasks = taskResolver.gather(cliInput);
    }

    var sequence = taskResolver.createRunSequence(tasks.valid);
    var success = 0;

    var seq = sequence.reduce(function (all, seq) {
        return all.concat(seq.fns.map(function (fn) {
            return Rx.Observable.create(function (x) {
                success += 1;
                x.log = logger.clone(function (x) {
                    x.prefix = '{gray: ' + getLogPrefix(basename(seq.task.taskName), 13) + ' :: ';
                    return x;
                });
                fn(x, seq.opts, input.ctx);
            });
        }));
    }, []);

    if (config.get('runMode') === 'sequence') {
        runInSequence(seq);
    } else {
        runInParallel(seq);
    }

    /**
     * Run each task only when the previous one
     * was completed
     * @param {Array} items - functions to call
     */
    function runInSequence(items) {

        var runner = Rx.Observable.fromArray(items).concatAll();

        /**
         * Accept values sent through 'onNext'
         */
        runner.subscribe(function (x) {
            // Handle
            //console.log(x);
            //console.log('here');
        }, function (e) {
            var currentTask = sequence[success - 1].task.taskName;
            logger.error('{red:ERROR in task {cyan:' + currentTask);
            //console.error(e.stack.split('\n').map(x => logger.compile('{gray:'+currentTask+' -- }' + x)).join('\n'));
            cb(e);
        }, function (s) {
            if (trigger.type === 'command') {
                handleCompletion();
            }
            cb(null, { tasks: tasks, runSequence: seq, sequence: sequence });
        });
    }

    /**
     * Logging for task completion
     */
    function handleCompletion() {
        logger.info('{gray:--------------------------');
        logger.info('{ok: } Completed without errors');
        logger.info('{gray:--------------------------');

        function logTask(tasks) {
            tasks.forEach(function (task) {
                logger.info('{gray:- %s', task.taskName);
                if (task.tasks.length) {
                    logTask(task.tasks);
                }
            });
        }

        var short = config.get('summary') === 'short';

        tasks.valid.forEach(function (task) {
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

module.exports.getTaskSequence = getTaskSequence;