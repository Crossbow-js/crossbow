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
    opts        = opts     || {};
    opts.cb     = opts.cb  || function () {};
    opts.cwd    = opts.cwd || process.cwd();
    opts.pkg    = opts.pkg || require(path.resolve(process.cwd(), "./package.json"));
    opts._ctx   = ctx(opts);

    if (cli.input[0] === 'run') {

        require('./lib/command.run')(cli, opts);
    }

    if (cli.input[0] === 'watch') {

        if (!opts.pkg.crossbow.watch) {
            console.error('watch config not found');
            return;
        }

        require('./lib/command.watch')(cli, opts);
    }
}

module.exports = handleCli;
module.exports.logger = logger;