#!/usr/bin/env node
var ctx     = require("crossbow-ctx");
var meow    = require('meow');
var path    = require('path');
var objPath = require('object-path');
var logger  = require('./lib/logger');
var prom    = require('prom-seq');

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
    opts     = opts     || {};
    opts.cb  = opts.cb  || function () {};
    opts.cwd = opts.cwd || process.cwd();
    opts.pkg = opts.pkg || require(path.resolve(process.cwd(), "./package.json"));

    var crossbow = objPath.get(opts, 'pkg.crossbow');

    if (cli.input[0] === 'run') {

        var task   = cli.input[1];
        var module, toRun, taskList;

        if (!task) {
            logger.error('Please provide a command for {magenta:Crossbow} to run');
            return;
        }

        if (crossbow) {
            var maybeTask = objPath.get(crossbow, ['tasks', task]);
            if (maybeTask) {
                taskList = maybeTask.run.map(gather);
            }
        }

        if (!taskList) {
            taskList = gather(task);
        }

        function gather (name) {
            return require(path.resolve(opts.cwd, 'node_modules', 'crossbow-' + name)).tasks;
        }

        prom.create(taskList)('', ctx(opts))
            .then(function () {
                logger.info('{yellow:%s} complete', task);
                opts.cb(null);
            })
            .progress(function (report) {

                logger[report.level](report.msg);
            })
            .catch(function (err) {
                throw err;
            }).done();
    }
}

module.exports = handleCli;