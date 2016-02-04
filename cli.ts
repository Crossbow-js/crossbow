#!/usr/bin/env node
/// <reference path="./typings/main.d.ts" />
const ctx              = require("./lib/ctx");
const meow             = require('meow');
const path             = require('path');
const logger           = require('./lib/logger');
const defaultCallback  = require('./lib/utils').defaultCallback;
const retrieveConfig   = require('./lib/utils').retrieveConfig;
const Immutable        = require('immutable');
const objectAssign     = require('object-assign');

interface Meow {
    input: string[]
    flags: any
    help: string
}

interface CrossbowInput {
    tasks?: any
    watch?: any
    config?: any
    gruntfile?: string
}

function generateMeowInput (incoming: Meow|any) : Meow {
    return objectAssign({input: [], flags:{}, help: ''}, incoming || {});
}

function generateConfig (incoming: CrossbowInput|any) : CrossbowInput {
    return objectAssign({tasks:{}, watch: {}, config:{}}, incoming || {});
}

const cli = meow({
    help: [
        'Usage',
        '  crossbow run <task>',
        '  crossbow watch <task>'
    ].join('\n')
});

if (!module.parent) {
    handleCli(cli, null, defaultCallback);
}

/**
 * @param {{input: Array, flags: Object}} cli - raw input from meow
 * @param {Object} input
 * @param {Function} [cb]
 */
function handleCli (cli: Meow, input: CrossbowInput|void, cb?) {

    cli = generateMeowInput(cli);

    if (cli.flags.logLevel) {
        logger.setLevel(cli.flags.logLevel);
    }

    if (cli.input[0] !== 'run' && cli.input[0] !== 'watch') {
        return console.log(cli.help);
    }

    cb           = cb || defaultCallback;
    const config = require('./lib/config').merge(cli.flags);

    if (input) {
        return processInput(cli, generateConfig(input), cb);
    } else {
        var fromFile = <CrossbowInput[]>retrieveConfig(cli.flags, config);
        if (fromFile.length) {
            return processInput(cli, generateConfig(fromFile[0]), cb);
        } else {
            if (config.get('strict')) {
                throw new Error('Config not provided. Either use a crossbow.js file in this directory, a `crossbow` property in your package.json, or use the --config flag' +
                    ' with a path to a JS/YML file');
            }

            logger.info('{red:x warning} No configuration provided, you may get unexpected results');
            return processInput(cli, generateConfig({}), cb);
        }
    }

    /**
     * Using either given input, or input resolved from a file,
     * process the cli commands
     * @param {{input: Array, flags: Object}} cli - raw input from meow
     * @param {Object} input
     */
    function processInput (cli: Meow, input: CrossbowInput, cb) {

        cli = generateMeowInput(cli);

        if (cli.flags.logLevel) {
            logger.setLevel(cli.flags.logLevel);
        }

        if (cli.input[0] === 'run') {

            if (cli.input.length === 1) {
                cb(new Error('You didn\'t provide a command for Crossbow to run'));
                return;
            }

            const run = require('./lib/command.run');
            return run(cli, input, config, cb);
        }

        if (cli.input[0] === 'watch') {

            if (!input.watch && cli.input.length === 1) {
                cb(new Error('Watch config not found'));
                return;
            }

            const watch = require('./lib/command.watch');
            return watch(cli, input, config);
        }
    }
}

module.exports        = handleCli;
module.exports.logger = logger;
module.exports.ctx    = ctx;
