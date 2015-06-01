#!/usr/bin/env node
var ctx    = require("crossbow-ctx");
var meow   = require('meow');
var logger = require('./lib/logger');

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
    opts = opts || {};
    opts.cb = opts.cb || function () {};

    if (cli.input[0] === 'run') {

        var task   = cli.input[1];

        if (!task) {
            logger.error('Please provide a command for {magenta:Crossbow} to run');
            return;
        }

        var module = require('crossbow-' + task);

        module('', ctx(opts)).then(function () {
            logger.info('{yellow:%s} complete', task);
            opts.cb(null);
        })
        .progress(function (report) {
            console.log(report.msg);
        })
        .catch(function (err) {
            opts.cb(err);
            throw err;
        }).done();
    }
}

module.exports = handleCli;