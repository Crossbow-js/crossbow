#!/usr/bin/env node
import runner = require('./command.run');
import {CrossbowConfiguration, merge, OutgoingSignals} from './config';
import {getRequirePaths} from './file.utils';
import {getInputs, InputTypes, UserInput} from "./input.resolve";
import * as reports from "./reporter.resolve";
import Rx = require('rx');
import {OutgoingReporter} from "./reporter.resolve";
import {Reporter} from "./reporter.resolve";
import {Reporters} from "./reporter.resolve";

const _ = require('../lodash.custom');
const debug = require('debug')('cb:init');

export interface CLI {
    input: string[]
    flags: any
    trailing?: string
    command?: string
}

export interface CrossbowInput {
    tasks: any
    watch: any
    options: any
    env?: any
    config?: any
}

export interface CrossbowReporter {
    (report: reports.IncomingReport): void
}

const availableCommands = {
    run: './command.run',
    r: './command.run',
    tasks: './command.tasks',
    t: './command.tasks',
    ls: './command.tasks',
    watch: './command.watch',
    w: './command.watch',
    watchers: './command.watchers',
    init: './command.init',
    docs: './command.docs',
};

const isCommand = (input) => Object.keys(availableCommands).indexOf(input) > -1;

export interface PreparedInputErrors {
    type: reports.ReportTypes
}

export interface PreparedInput {
    cli: CLI
    config: CrossbowConfiguration
    userInput: UserInput,
    reporters: Reporters
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
export function prepareInput(cli: CLI, input?: CrossbowInput|any): PreparedInput {

    const mergedConfig = merge(cli.flags);
    const userInput    = getInputs(mergedConfig, input);
    const reporters    = reports.getReporters(mergedConfig, input);

    // Bail early if a user tried to load a specific file
    // but it didn't exist, or had some other error
    // // if (userInput.errors.length) {
    // //     reportFn({type: reports.ReportTypes.InputError, data: userInput});
    // //     return {
    // //         userInput,
    // //         cli,
    // //         config: mergedConfig,
    // //         reportFn,
    // //         errors: [{type: reports.ReportTypes.InputError}]
    // //     } as PreparedInput
    // // }
    // //
    // // // at this point, there are no invalid reporters or input files
    // // // so we can reset the reporters to anything that may of come in via config
    const config  = (function () {
        if (userInput.inputs.length) {
            return merge(_.merge({}, userInput.inputs[0].config, cli.flags));
        }
        return mergedConfig;
    })();
    // //
    // // resolvedReporters = reports.getReporters(mergedConfig, input);
    // // hasReporters      = resolvedReporters.valid.length;
    // //
    // // /**
    // //  * Set the signal observer
    // //  * todo: Clean up how this is assigned
    // //  * @type {OutgoingSignals}
    // //  */
    // // mergedConfig.signalObserver = chosenSignalObserver;
    // //
    // // // Check if any given reporter are invalid
    // // // and defer to default (again)
    // // if (resolvedReporters.invalid.length) {
    // //     reportFn({type: reports.ReportTypes.InvalidReporter, data: {reporters: resolvedReporters}} as reports.InvalidReporterReport);
    // //     return {
    // //         userInput,
    // //         cli,
    // //         reportFn,
    // //         config: mergedConfig,
    // //         errors: [{type: reports.ReportTypes.InvalidReporter}]
    // //     } as PreparedInput
    // // }
    //
    // // Show the user which external inputs are being used
    // if (userInput.type === InputTypes.ExternalFile ||
    //     userInput.type === InputTypes.CBFile ||
    //     userInput.type === InputTypes.DefaultExternalFile
    // ) reportFn({type: reports.ReportTypes.UsingInputFile, data: {sources: userInput.sources}});

    return {
        userInput,
        cli,
        reporters,
        config
    }
}

/**
 * This the the proxy that allows command/run mode to be handled
 * @param preparedInput
 */
export function handleIncoming<ReturnType>(preparedInput: PreparedInput): ReturnType {

    const {cli, userInput, config} = preparedInput;

    // if the user provided a --cbfile flag, the type 'CBFile'
    // must be available, otherwise this is an error state
    if (userInput.type === InputTypes.CBFile) {
        return handleCBfileMode(cli, config);
    }

    const firstArg = cli.input[0];
    return require(availableCommands[firstArg]).default.call(null, cli, userInput.inputs[0], config);
}

function handleCBfileMode(cli: CLI, config: CrossbowConfiguration) {

    const createFilePaths  = getRequirePaths(config);
    const input            = require(createFilePaths.valid[0].resolved);

    input.default.config   = processConfigs(_.merge({}, config, input.default.config), cli.flags);
    input.default.cli      = cli;

    if (isCommand(cli.input[0])) {
        return require(availableCommands[cli.input[0]]).default.call(null, cli, input.default, input.default.config);
    }

    cli.input = ['run'].concat(cli.input);

    return require(availableCommands['run']).default.call(null, cli, input.default, input.default.config);
}

/**
 * @param config
 * @param flags
 * @returns {CrossbowConfiguration}
 */
function processConfigs (config, flags) {
    const cbConfig     = _.merge({}, config, flags);
    return merge(cbConfig);
}

/**
 * This is the default export that can be
 * used as a convenience method.
 * Note: types are lost when using this method.
 */
export default function (cli: CLI, input?: CrossbowInput) {

    const prepared = prepareInput(cli, input);
    const errors = [...prepared.userInput.errors];

    if (errors.length) {
        return Rx.Observable.just({
            errors
        });
    }

    return handleIncoming<any>(prepared);
}


