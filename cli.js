#!/usr/bin/env node
var ctx     = require("./lib/ctx");
var meow    = require('meow');
var path    = require('path');
var logger  = require('./lib/logger');
var defaultCallback  = require('./lib/utils').defaultCallback;
var retrieveConfig  = require('./lib/utils').retrieveConfig;

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

    opts          = opts          || {};
    cli.flags     = cli.flags     || {};
    opts.cb       = opts.cb       || defaultCallback;
    opts.cwd      = opts.cwd      || process.cwd();
    opts.crossbow = opts.crossbow || retrieveConfig(opts, cli.flags);

    opts.ctx      = ctx(opts);

    if (cli.flags.logLevel) {
        logger.setLevel(cli.flags.logLevel);
    }

    if (cli.input[0] === 'copy') {
        if (!opts.crossbow.copy) {
            logger.error('copy config not found, tried: %s', maybePath);
            return;
        }
        require('./lib/command.copy')(cli, opts);
    }

    if (cli.input[0] === 'run') {

        require('./lib/command.run')(cli, opts, {
            type: "command",
            cli: cli
        });
    }

    if (cli.input[0] === 'watch') {

        if (!opts.crossbow.watch) {
            opts.cb(new Error('watch config not found in ' + maybePath));
            return;
        }

        require('./lib/command.watch')(cli, opts);
    }
}

module.exports = handleCli;
module.exports.logger = logger;