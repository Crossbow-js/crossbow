#!/usr/bin/env node
/// <reference path="../typings/main.d.ts" />
import runner = require('./command.run');
import * as reporter from './reporters/defaultReporter';
import {CrossbowConfiguration, merge} from './config';
import {TaskRunner} from './task.runner';
import {getRequirePaths} from './task.utils';
import {handleIncomingRunCommand} from "./command.run";
import {handleIncomingWatchCommand} from "./command.watch";
import {handleIncomingTasksCommand} from "./command.tasks";
import {handleIncomingWatchersCommand} from "./command.watchers";
import {handleIncomingInitCommand} from "./command.init";
import cli from "./cli";
import {getInputs, InputTypes, UserInput} from "./input.resolve";
import {getReporters, getDefaultReporter, ReportNames, Reporter} from "./reporter.resolve";

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

export interface CrossbowReporter {
    (name: ReportNames, ...args): void
}

const availableCommands = {
    run: handleIncomingRunCommand,
    r: handleIncomingRunCommand,
    tasks: handleIncomingTasksCommand,
    t: handleIncomingTasksCommand,
    ls: handleIncomingTasksCommand,
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

    let mergedConfig      = merge(cli.flags);
    const userInput       = getInputs(mergedConfig, input);
    let resolvedReporters = getReporters(mergedConfig, input);
    let hasReporters      = resolvedReporters.valid.length;
    const defaultReporter = getDefaultReporter();

    // Check if any given reporter are invalid
    // and defer to default
    if (resolvedReporters.invalid.length) {
        defaultReporter(ReportNames.InvalidReporter, resolvedReporters);
        return;
    }

    // proxy for calling reporter functions.
    // uses default if none given
    const reportFn = function (...args) {
        if (!hasReporters) {
            return defaultReporter.apply(null, args);
        }
        resolvedReporters.valid.forEach(function (reporter: Reporter) {
            reporter.callable.apply(null, args);
        });
    };


    // Bail early if a user tried to load a specific file
    // but it didn't exist, or had some other error
    if (userInput.errors.length) {
        reportFn(ReportNames.InputFileNotFound, userInput.sources);
        return;
    }

    // at this point, there are no invalid reporters or input files
    // so we can reset the reporters to anything that may of come in via config
    if (userInput.inputs.length) {
        mergedConfig = merge(_.merge({}, userInput.inputs[0].config, cli.flags));
    }
    resolvedReporters = getReporters(mergedConfig, input);
    hasReporters      = resolvedReporters.valid.length;

    // Check if any given reporter are invalid
    // and defer to default (again)
    if (resolvedReporters.invalid.length) {
        defaultReporter(ReportNames.InvalidReporter, resolvedReporters);
        return;
    }

    // Show the user which external inputs are being used
    if (userInput.type === InputTypes.ExternalFile ||
        userInput.type === InputTypes.CBFile ||
        userInput.type === InputTypes.DefaultExternalFile
    ) reportFn(ReportNames.UsingConfigFile, userInput.sources);

    // if the user provided a --cbfile flag, the type 'CBFile'
    // must be available, otherwise this is an error state
    if (userInput.type === InputTypes.CBFile) {
        return handleCBfileMode(cli, mergedConfig, reportFn);
    }
    
    // if the user provided a -c flag, but external files were
    // not return, this is an error state.
    if (mergedConfig.config.length && userInput.type === InputTypes.ExternalFile) {
        return processInput(cli, userInput.inputs[0], mergedConfig, reportFn);
    }

    return processInput(cli, userInput.inputs[0], mergedConfig, reportFn);
}

function handleCBfileMode(cli: CLI, config: CrossbowConfiguration, reportFn: CrossbowReporter) {

    var createFilePaths = getRequirePaths(config);
    var input = require(createFilePaths.valid[0].resolved);
    input.default.config = processConfigs(_.merge({}, config, input.default.config), cli.flags);
    input.default.cli = cli;
    input.default.reporter = reportFn;

    if (isCommand(cli.input[0])) {
        return availableCommands[cli.input[0]].call(null, cli, input.default, input.default.config, reportFn);
    }

    cli.input = ['run'].concat(cli.input);

    return availableCommands['run'].call(null, cli, input.default, input.default.config, reportFn);
}

/**
 * Now decide who should handle the current command
 */
function processInput(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration, reportFn: CrossbowReporter): any {
    const firstArg = cli.input[0];
    return availableCommands[firstArg].call(null, cli, input, config, reportFn);
}

function processConfigs (config, flags) {
    const cbConfig     = _.merge({}, config, flags);
    return merge(cbConfig);
}

export default handleIncoming;


