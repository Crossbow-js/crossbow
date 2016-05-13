#!/usr/bin/env node
/// <reference path="../typings/main.d.ts" />
import runner = require('./command.run');
import * as reporter from './reporters/defaultReporter';
import {CrossbowConfiguration, merge} from './config';
import {TaskRunner} from './task.runner';
import {retrieveDefaultInputFiles, readFiles, retrieveCBFiles, InputFiles, getRequirePaths} from './task.utils';
import {handleIncomingRunCommand} from "./command.run";
import {handleIncomingTreeCommand} from "./command.tree";
import {handleIncomingWatchCommand} from "./command.watch";
import {handleIncomingTasksCommand} from "./command.tasks";
import {handleIncomingWatchersCommand} from "./command.watchers";
import logger from './logger';

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
    w: handleIncomingWatchCommand,
    watchers: handleIncomingWatchersCommand
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

    cli                = generateMeowInput(cli);
    const mergedConfig = merge(cli.flags);
    const cbfiles      = retrieveCBFiles(mergedConfig);

    if (cbfiles.valid.length || mergedConfig.cbfile) {
        return handleCBfileMode(cbfiles, cli, mergedConfig);
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
                // debug(`Using external input from ${userConfig.valid[0].resolved}`);
                logger.info(`Using {cyan.bold:${userConfig.valid[0].resolved}}`);
                return processInput(cli, generateInput(userConfig.valid[0].input), mergedConfig);
            }
        } else {
            if (input === undefined) {
                debug('No external input provided');
            }
            const defaultInputFiles = retrieveDefaultInputFiles(mergedConfig);
            if (defaultInputFiles.valid.length) {
                logger.info(`Using {cyan.bold:${defaultInputFiles.valid[0].resolved}}`);
                return processInput(cli, generateInput(defaultInputFiles.valid[0].input), mergedConfig);
            }
        }
    }

    return processInput(cli, generateInput(input), mergedConfig);
}

function handleCBfileMode(cbfiles: InputFiles, cli: Meow, config: CrossbowConfiguration) {
    /**
     * Check if there's a cbfile.js in the root
     * If there is, we enter into 'gulp' mode by default
     */
    if (cbfiles.valid.length) {
        logger.info(`Using {cyan.bold:${cbfiles.valid[0].resolved}}`);
        debug(`using ${cbfiles.valid[0]}`);
        var createFilePaths = getRequirePaths(config);
        var input = require(createFilePaths.valid[0].resolved);
        input.default.config = config;
        input.default.cli = cli;
        if (isCommand(cli.input[0])) {
            return availableCommands[cli.input[0]].call(null, cli, input.default, config);
        }
        cli.input = ['run'].concat(cli.input);
        return availableCommands['run'].call(null, cli, input.default, config);
    }
    /**
     * Did the user provide the --cbfile flag, but the file was
     * not found? Exit with error if so
     */
    if (config.cbfile && cbfiles.invalid.length) {
        console.log('There were errors resolving the following input file(s):');
        reporter.reportMissingConfigFile(cbfiles);
        return;
    }
}

/**
 * Now decide who should handle the current command
 */
function processInput(cli: Meow, input: CrossbowInput, config: CrossbowConfiguration): any {
    const firstArg = cli.input[0];
    return availableCommands[firstArg].call(null, cli, input, config);
}

export default handleIncoming;


