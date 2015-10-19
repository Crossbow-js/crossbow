#!/usr/bin/env node
var ctx              = require("./lib/ctx");
var meow             = require('meow');
var path             = require('path');
var logger           = require('./lib/logger');
var defaultCallback  = require('./lib/utils').defaultCallback;
var retrieveConfig   = require('./lib/utils').retrieveConfig;
var Immutable        = require('immutable');

var cli = meow({
    help: [
        'Usage',
        '  crossbow run <task>',
        '  crossbow watch <task>'
    ].join('\n')
});

if (!module.parent) {
    handleCli(cli, {});
}

/**
 * @param {{input: Array, flags: Object}} cli - raw input from meow
 * @param {Object} input
 * @param {Function} [cb]
 */
function handleCli (cli, input, cb) {

    if (typeof input === 'function') {
        cb = input;
        input = {};
    }

    if (cli.input[0] !== 'run' && cli.input[0] !== 'watch') {
        return console.log(cli.help);
    }

    cb            = cb || defaultCallback;
    cli.flags     = cli.flags || {};
    var config    = require('./lib/config').merge(cli.flags);

    if (input.crossbow) {
        return processInput(cli, input);
    } else {
        var fromFile = retrieveConfig(cli.flags, config);
        if (fromFile.length) {
            return processInput(cli, {crossbow: fromFile[0]});
        } else {
            throw new Error('Config not provided. Either use a crossbow.js file in this directory, a `crossbow` property in your package.json, or use the --config flag' +
                ' with a path to a JS/YML file');
        }
    }

    /**
     * Using either given input, or input resolved from a file,
     * process the cli commands
     * @param {{input: Array, flags: Object}} cli - raw input from meow
     * @param {Object} input
     * @returns {*}
     */
    function processInput (cli, input) {

        if (cli.flags.logLevel) {
            logger.setLevel(cli.flags.logLevel);
        }

        if (cli.input[0] === 'run') {

            //require('./lib/grunt-compat')();
            if (cli.input.length === 1) {
                cb(new Error('You didn\'t provide a command for Crossbow to run'));
                return;
            }

            var run = require('./lib/command.run');

            return run(cli, input, config, cb);
        }

        if (cli.input[0] === 'watch') {

            if (!input.crossbow.watch) {
                input.cb(new Error('Watch config not found'));
                return;
            }

            return require('./lib/command.watch')(cli, input, config, cb);
        }
    }
}

module.exports        = handleCli;
module.exports.logger = logger;
module.exports.ctx    = ctx;

/**
 * @param input
 * @param flags
 * @param cb
 */
module.exports.run    = function (input, flags, cb) {
    if (typeof flags === 'function') {
        cb = flags;
        flags = {};
    }
    handleCli({
        input: ['run'].concat(input),
        flags: flags
    }, cb);
};

/**
 * @param input
 * @param flags
 * @param cb
 */
module.exports.handoff = function (tasks, input, flags, cb) {
    input = input || {};
    if (typeof flags === 'function') {
        cb = flags;
        flags = {};
    }
    flags.handoff = true;
    handleCli({
        input: ['run'].concat(tasks),
        flags: flags
    }, input, cb);
};

/**
 * @param input
 * @param flags
 * @param cb
 */
module.exports.watch = function (input, flags, cb) {
    if (typeof flags === 'function') {
        cb = flags;
        flags = {};
    }
    handleCli({
        input: ['watch'].concat(input),
        flags: flags
    }, cb);
};
