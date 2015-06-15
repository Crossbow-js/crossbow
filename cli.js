#!/usr/bin/env node
var ctx     = require("crossbow-ctx");
var meow    = require('meow');
var path    = require('path');
var logger  = require('./lib/logger');

var cli = meow({
    help: [
        'Usage',
        '  crossbow run <task>'
    ].join('\n')
});

if (!module.parent) {
    handleCli(cli);
}

function handleCli (cli, opts) {
    var maybePath = path.resolve(process.cwd(), "./package.json");
    opts        = opts     || {};
    opts.cb     = opts.cb  || function () {};
    opts.cwd    = opts.cwd || process.cwd();
    opts.pkg    = opts.pkg || require(maybePath);
    opts._ctx   = ctx(opts);

    if (cli.flags.logLevel) {
        logger.setLevel(cli.flags.logLevel);
    }

    if (cli.input[0] === 'run') {

        require('./lib/command.run')(cli, opts);
    }

    if (cli.input[0] === 'watch') {

        if (!opts.pkg.crossbow.watch) {
            logger.error('watch config not found, tried: %s', maybePath);
            return;
        }

        require('./lib/command.watch')(cli, opts);
    }
}

module.exports = handleCli;
module.exports.logger = logger;