#!/usr/bin/env node
/// <reference path="../typings/main.d.ts" />
import runner = require('./command.run');
import * as reporter from './reporters/defaultReporter';
import {CrossbowConfiguration, merge} from './config';
import {TaskRunner} from './task.runner';
import {retrieveDefaultInputFiles, readFiles, retrieveCBFiles} from './task.utils';
import {handleIncomingRunCommand} from "./command.run";
import {handleIncomingTreeCommand} from "./command.tree";
import {handleIncomingWatchCommand} from "./command.watch";
import {handleIncomingTasksCommand} from "./command.tasks";

const meow = require('meow');
const assign = require('object-assign');
const _merge = require('lodash.merge');
const debug = require('debug')('cb:init');

export interface Meow {
    input: string[]
    flags: any
    help?: string
}

export interface CrossbowInput {
    tasks: any
    watch: any
    options: any
    config?: any
}

function generateMeowInput(incoming: Meow|any): Meow {
    return assign({input: [], flags: {}}, incoming || {});
}
/**
 * `Input` is the object that is looked at to resolve tasks/options and
 * watchers
 */
function generateInput(incoming: CrossbowInput|any): CrossbowInput {

    return _merge({
        tasks: {},
        watch: {
            before: [],
            options: {}
        },
        options: {}
    }, incoming || {});
}

const availableCommands = {
    run: handleIncomingRunCommand,
    tasks: handleIncomingTasksCommand,
    tree: handleIncomingTreeCommand,
    doctor: handleIncomingTreeCommand,
    watch: handleIncomingWatchCommand,
    w: handleIncomingWatchCommand
};

if (!module.parent) {
    const cli = <Meow>meow('', {
        alias: {
            q: 'suppressOutput',
            i: 'interactive',
            s: 'strict'
        }
    });
    handleIncoming(cli);
}

function isCommand(input) {
    return Object.keys(availableCommands).indexOf(input) > -1;
}

function handleIncoming(cli: Meow, input?: CrossbowInput|any): TaskRunner {
    cli = generateMeowInput(cli);

    const mergedConfig = merge(cli.flags);

    const cbfiles = retrieveCBFiles(mergedConfig);

    /**
     * Check if there's a cbfile.js in the root
     */
    if (cbfiles.valid.length) {
        debug('cbfile.js exists');
        var input = require('./public/create.js');
        input.default.config = mergedConfig;
        input.default.cli = cli;
        if (isCommand(cli.input[0])) {
            return availableCommands[cli.input[0]].call(null, cli, input.default, mergedConfig);
        }
        cli.input = ['run'].concat(cli.input);
        return availableCommands['run'].call(null, cli, input.default, mergedConfig);
    }

    if (Object.keys(availableCommands).indexOf(cli.input[0]) === -1) {
        console.log('Show help here');
        return;
    }

    /**
     * If a user tried to load configuration from
     * an external file, load that now and set as the input
     */
    if (mergedConfig.config || input === undefined) {

        if (mergedConfig.config) {
            debug(`Config flag provided ${mergedConfig.config}`);
            const userConfig = readFiles([<string>mergedConfig.config], mergedConfig.cwd);
            if (userConfig.invalid.length) {
                console.log('There were errors resolving the following input file(s):');
                reporter.reportMissingConfigFile(userConfig);
                return;
            }
            if (userConfig.valid.length) {
                debug(`Using external input from ${userConfig.valid[0].resolved}`);
                return processInput(cli, generateInput(userConfig.valid[0].input), mergedConfig);
            }
        } else {
            if (input === undefined) {
                debug('No external input provided');
            }
            const defaultInputFiles = retrieveDefaultInputFiles(mergedConfig);
            if (defaultInputFiles.valid.length) {
                return processInput(cli, generateInput(defaultInputFiles.valid[0].input), mergedConfig);
            }
        }
    }

    return processInput(cli, generateInput(input), mergedConfig);
}

/**
 * Now decide who should handle the current command
 */
function processInput(cli: Meow, input: CrossbowInput, config: CrossbowConfiguration): any {
    const firstArg = cli.input[0];
    return availableCommands[firstArg].call(null, cli, input, config);
}

export default handleIncoming;

module.exports = handleIncoming;

module.exports.getRunner = function getRunner(tasks: string[], input?: any, config?: any) {
    return handleIncoming({
        input: ['run', ...tasks],
        flags: assign({handoff: true}, config)
    }, input || {});
};

module.exports.getWatcher = function getWatcher(tasks: string[], input?: any, config?: any) {
    return handleIncoming({
        input: ['watch', ...tasks],
        flags: assign({handoff: true}, config)
    }, input || {});
};

module.exports.runner = function getRunner(tasks: string[], input?: any, config?: any) {
    const result = handleIncoming({
        input: ['run', ...tasks],
        flags: assign({handoff: true}, config)
    }, input || {});
    return result.runner;
};

module.exports.run = function run(tasks: string[], input?: any, config?: any) {
    handleIncoming({
        input: ['run', ...tasks],
        flags: config || {}
    }, input || {});
};

