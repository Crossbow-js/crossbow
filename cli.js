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
        '  crossbow run <task>'
    ].join('\n')
});

var defaults = {
    cwd: process.cwd(),
    runMode: 'sequence',
    resumeOnError: false,
    summary: 'short',
    strict: true
};

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

    cb            = cb || defaultCallback;
    cli.flags     = cli.flags || {};
    var config    = Immutable.fromJS(defaults).mergeDeep(cli.flags);

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
            if (cli.input.length === 1) {
                cb(new Error('You didn\'t provide a command for Crossbow to run'));
                return;
            }
            return require('./lib/command.run')(cli, input, config, cb);
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