#!/usr/bin/env node
/// <reference path="../typings/main.d.ts" />
import runner = require('./command.run');
import * as reporter from './reporters/defaultReporter';
import {CrossbowConfiguration, merge} from './config';
import {TaskRunner} from './task.runner';
import {getRequirePaths} from './task.utils';
import {handleIncomingRunCommand} from "./command.run";
import {handleIncomingTreeCommand} from "./command.tree";
import {handleIncomingWatchCommand} from "./command.watch";
import {handleIncomingTasksCommand} from "./command.tasks";
import {handleIncomingWatchersCommand} from "./command.watchers";
import {handleIncomingInitCommand} from "./command.init";
import cli from "./cli";
import {getInputs, InputTypes} from "./input.resolve";

const _ = require('../lodash.custom');
const debug = require('debug')('cb:init');

export interface CLI {
    input: string[]
    flags: any
}

export interface CrossbowInput {
    tasks: any
    watch: any
    options: any
    env?: any
    config?: any
}

const availableCommands = {
    run: handleIncomingRunCommand,
    tasks: handleIncomingTasksCommand,
    tree: handleIncomingTreeCommand,
    doctor: handleIncomingTreeCommand,
    watch: handleIncomingWatchCommand,
    w: handleIncomingWatchCommand,
    watchers: handleIncomingWatchersCommand,
    init: handleIncomingInitCommand
};
const isCommand = (input) => Object.keys(availableCommands).indexOf(input) > -1;

/**
 * If running from the CLI, hand off to 'yargs' for parsing options
 */
if (!module.parent) {
    cli(handleIncoming);
}

/**
 * Handle any type of init. It could be from the CLI, or via the API.
 * eg, any command from the CLI ultimately ends up in the following call
 *    $  crossbow run task1 -c conf/cb.js
 *    -> handleIncoming({
 *          input: ['run', 'task1'],
 *          flags: {c: 'conf/cb.js'}
 *       });
 */
function handleIncoming(cli: CLI, input?: CrossbowInput|any): TaskRunner {

    const mergedConfig = merge(cli.flags);
    const userInput    = getInputs(mergedConfig, input);

    // Bail early if a user tried to load a specific file
    // but it didn't exist, or had some other error
    if (userInput.errors.length) {
        reporter.reportMissingConfigFile(userInput.sources);
        return;
    }

    // Show the user which external inputs are being used
    if (userInput.type === InputTypes.ExternalFile ||
        userInput.type === InputTypes.CBFile ||
        userInput.type === InputTypes.DefaultExternalFile
    ) reporter.reportUsingConfigFile(userInput.sources[0].resolved);
    
    // if the user provided a --cbfile flag, the type 'CBFile'
    // must be available, otherwise this is an error state
    if (mergedConfig.cbfile && userInput.type === InputTypes.CBFile) {
        return handleCBfileMode(cli, mergedConfig);
    }

    // if the user provided a -c flag, but external files were
    // not return, this is an error state.
    if (mergedConfig.config.length && userInput.type === InputTypes.ExternalFile) {
        return processInput(cli, userInput.inputs[0]);
    }

    return processInput(cli, userInput.inputs[0]);
}

function handleCBfileMode(cli: CLI, config: CrossbowConfiguration) {

    var createFilePaths = getRequirePaths(config);
    var input = require(createFilePaths.valid[0].resolved);
    input.default.config = processConfigs(_.merge({}, config, input.default.config), cli.flags);
    input.default.cli = cli;

    if (isCommand(cli.input[0])) {
        return availableCommands[cli.input[0]].call(null, cli, input.default, input.default.config);
    }

    cli.input = ['run'].concat(cli.input);

    return availableCommands['run'].call(null, cli, input.default, input.default.config);
}

/**
 * Now decide who should handle the current command
 */
function processInput(cli: CLI, input: CrossbowInput): any {
    const firstArg = cli.input[0];
    const merged   = merge(_.merge({}, input.config, cli.flags));
    return availableCommands[firstArg].call(null, cli, input, merged);
}

function processConfigs (config, flags) {
    const cbConfig     = _.merge({}, config, flags);
    return merge(cbConfig);
}

export default handleIncoming;


