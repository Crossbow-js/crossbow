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
                require('./reporter')(runner, config);
                cb(null, runner);
            }
    );

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