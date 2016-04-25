#!/usr/bin/env node
/// <reference path="../typings/main.d.ts" />
import runner = require('./command.run');
import {CrossbowConfiguration, merge} from './config';
import {TaskRunner} from './task.runner';
import {retrieveDefaultInputFiles, createCrossbowTasksFromNpmScripts, readFiles} from './task.utils';
import {handleIncomingRunCommand} from "./command.run";
import {handleIncomingTreeCommand} from "./command.tree";
import {handleIncomingWatchCommand} from "./command.watch";

const meow   = require('meow');
const assign = require('object-assign');
const _merge = require('lodash.merge');
const debug  = require('debug')('cb:init');

export interface Meow {
    input: string[]
    flags: any
    help?: string
}

function generateMeowInput (incoming: Meow|any) : Meow {
    return assign({input: [], flags:{}}, incoming || {});
}

export interface CrossbowInput {
    tasks: any
    watch: any
    config: any
    gruntfile?: string
    npmScripts: any
    mergedTasks: any
}

/**
 * `Input` is the object that is looked at to resolve tasks/config and
 * watchers
 * @param incoming
 * @param config
 * @returns {any}
 */
function generateInput (incoming: CrossbowInput|any, config: CrossbowConfiguration) : CrossbowInput {

    const npmScriptsAsCrossbowTasks = createCrossbowTasksFromNpmScripts(config.cwd);

    return _merge({
        tasks: {},
        watch: {
            before: [],
            options: {}
        },
        config:{},
        npmScripts: npmScriptsAsCrossbowTasks
    }, incoming || {});
}

const availableCommands = {
    run: handleIncomingRunCommand,
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

function handleIncoming (cli: Meow, input?: CrossbowInput|any): TaskRunner {
    cli = generateMeowInput(cli);
    const mergedConfig = merge(cli.flags);

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
                userConfig.invalid.forEach(function (input) {
                	console.log(`Your input: '${input.path}'`);
                	console.log(`Attempted:  '${input.resolved}'`);
                });
                // console.log(`Could not resolve config file '${mergedConfig.config}'`);
                return;
            }
        } else {
            if (input === undefined) {
               debug('No input provided');
            }
        }

        const externalInputs = retrieveDefaultInputFiles(mergedConfig);
        if (externalInputs.length) {
            debug(`Using external input from ${externalInputs[0].path}`);
            return processInput(cli, generateInput(externalInputs[0].input, mergedConfig), mergedConfig);
        }
    }

    return processInput(cli, generateInput(input, mergedConfig), mergedConfig);
}

/**
 * Now decide who should handle the current command
 */
function processInput(cli: Meow, input: CrossbowInput, config: CrossbowConfiguration) : any {
    const firstArg = cli.input[0];
    return availableCommands[firstArg].call(null, cli, input, config);
}

export default handleIncoming;

module.exports = handleIncoming;

module.exports.getRunner = function getRunner (tasks: string[], input?: any, config?: any) {
    return handleIncoming({
        input: ['run', ...tasks],
        flags: assign({handoff: true}, config)
    }, input || {});
};

module.exports.getWatcher = function getWatcher (tasks: string[], input?: any, config?: any) {
    return handleIncoming({
        input: ['watch', ...tasks],
        flags: assign({handoff: true}, config)
    }, input || {});
};

module.exports.runner = function getRunner (tasks: string[], input?: any, config?: any) {
    const result = handleIncoming({
        input: ['run', ...tasks],
        flags: assign({handoff: true}, config)
    }, input || {});
    return result.runner;
};

module.exports.run = function run (tasks: string[], input?: any, config?: any) {
    handleIncoming({
        input: ['run', ...tasks],
        flags: config || {}
    }, input || {});
};

