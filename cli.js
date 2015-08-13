#!/usr/bin/env node
var ctx              = require("./lib/ctx");
var meow             = require('meow');
var path             = require('path');
var logger           = require('./lib/logger');
var defaultCallback  = require('./lib/utils').defaultCallback;
var retrieveConfig   = require('./lib/utils').retrieveConfig;
var Immutable   = require('immutable');

var cli = meow({
    help: [
        'Usage',
        '  crossbow run <task>'
    ].join('\n')
});

var defaults = {
    cwd: process.cwd(),
    runMode: 'sequence',
    resumeOnError: false
};

if (!module.parent) {
    handleCli(cli, {});
}

function handleCli (cli, input, cb) {

    if (typeof input === 'function') {
        cb = input;
        input = {};
    }

    cli.flags = cli.flags || {};

    var maybePath = path.resolve(process.cwd(), "./package.json");
    var config    = Immutable.fromJS(defaults).mergeDeep(cli.flags);
    config        = config.set('cb', cb || defaultCallback);

    if (input.crossbow) {
        return processInput(cli, input);
    } else {
        var fromFile = retrieveConfig(cli.flags, config);
        if (fromFile.length) {
            return processInput(cli, {crossbow: fromFile[0]});
        } else {
            throw new Error('Config not provided. Either use a crossbow.js file in this directory, a `crossbow` property in your package.json, or use the --config flag' +
                ' with a path to a JS file');
        }
    }

    function processInput (cli, input) {

        input.ctx = ctx(input);

        if (cli.flags.logLevel) {
            logger.setLevel(cli.flags.logLevel);
        }

        if (cli.input[0] === 'copy') {
            if (!input.crossbow.copy) {
                logger.error('copy config not found, tried: %s', maybePath);
                return;
            }
            return require('./lib/command.copy')(cli, input);
        }

        if (cli.input[0] === 'run') {

            return require('./lib/command.run')(cli, input, {
                type: "command",
                cli: cli,
                config: config
            });
        }

        if (cli.input[0] === 'watch') {

            if (!input.crossbow.watch) {
                input.cb(new Error('watch config not found in ' + maybePath));
                return;
            }

            return require('./lib/command.watch')(cli, input);
        }
    }
}

module.exports        = handleCli;
module.exports.logger = logger;
module.exports.ctx    = ctx;