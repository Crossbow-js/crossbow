#!/usr/bin/env node
import runner = require('./command.run');
import {CrossbowConfiguration, merge, OutgoingSignals} from './config';
import {getRequirePaths} from './file.utils';
import {getInputs, InputTypes, UserInput} from "./input.resolve";
import * as reports from "./reporter.resolve";
import Rx = require('rx');
import {OutgoingReporter} from "./reporter.resolve";

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
    reportFn?: CrossbowReporter
    userInput: UserInput
    errors: PreparedInputErrors[]
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
export function prepareInput(cli: CLI, input?: CrossbowInput|any, outputObserver?: OutgoingReporter, signalObserver?: OutgoingSignals): PreparedInput {

    let mergedConfig         = merge(cli.flags);
    const userInput          = getInputs(mergedConfig, input);
    let resolvedReporters    = reports.getReporters(mergedConfig, input);
    let chosenOutputObserver = reports.getOutputObserver(mergedConfig, outputObserver);
    let chosenSignalObserver = reports.getSignalReporter(mergedConfig, signalObserver);
    let hasReporters         = resolvedReporters.valid.length;
    const defaultReporter    = reports.getDefaultReporter();

    // Check if any given reporter are invalid
    // and defer to default
    if (resolvedReporters.invalid.length) {
        defaultReporter({
            type: reports.ReportTypes.InvalidReporter,
            data: {
                reporters: resolvedReporters
            }
        } as reports.InvalidReporterReport, chosenOutputObserver);

        return {
            userInput,
            cli,
            config: mergedConfig,
            errors: [{type: reports.ReportTypes.InvalidReporter}]
        } as PreparedInput
    }

    // proxy for calling reporter functions.
    // uses default if none given
    const reportFn = function (report: reports.IncomingReport) {
        if (!hasReporters) {
            return defaultReporter(report, chosenOutputObserver);
        }
        resolvedReporters.valid.forEach(function (reporter: reports.Reporter) {
            reporter.callable(report, chosenOutputObserver);
        });
    };

    // Bail early if a user tried to load a specific file
    // but it didn't exist, or had some other error
    if (userInput.errors.length) {
        reportFn({type: reports.ReportTypes.InputError, data: userInput});
        return {
            userInput,
            cli,
            config: mergedConfig,
            reportFn,
            errors: [{type: reports.ReportTypes.InputError}]
        } as PreparedInput
    }

    // at this point, there are no invalid reporters or input files
    // so we can reset the reporters to anything that may of come in via config
    if (userInput.inputs.length) {
        mergedConfig = merge(_.merge({}, userInput.inputs[0].config, cli.flags));
    }
    resolvedReporters = reports.getReporters(mergedConfig, input);
    hasReporters      = resolvedReporters.valid.length;

    /**
     * Set the signal observer
     * todo: Clean up how this is assigned
     * @type {OutgoingSignals}
     */
    mergedConfig.signalObserver = chosenSignalObserver;

    // Check if any given reporter are invalid
    // and defer to default (again)
    if (resolvedReporters.invalid.length) {
        reportFn({type: reports.ReportTypes.InvalidReporter, data: {reporters: resolvedReporters}} as reports.InvalidReporterReport);
        return {
            userInput,
            cli,
            reportFn,
            config: mergedConfig,
            errors: [{type: reports.ReportTypes.InvalidReporter}]
        } as PreparedInput
    }

    // Show the user which external inputs are being used
    if (userInput.type === InputTypes.ExternalFile ||
        userInput.type === InputTypes.CBFile ||
        userInput.type === InputTypes.DefaultExternalFile
    ) reportFn({type: reports.ReportTypes.UsingInputFile, data: {sources: userInput.sources}});

    return {
        userInput,
        cli,
        reportFn,
        config: mergedConfig,
        errors: []
    }
}

/**
 * This the the proxy that allows command/run mode to be handled
 * @param preparedInput
 */
export function handleIncoming<ReturnType>(preparedInput: PreparedInput): ReturnType {

    const {cli, userInput, config, reportFn} = preparedInput;
    
    // if the user provided a --cbfile flag, the type 'CBFile'
    // must be available, otherwise this is an error state
    if (userInput.type === InputTypes.CBFile) {
        return handleCBfileMode(cli, config, reportFn);
    }

    return processInput(cli, userInput.inputs[0], config, reportFn);
}

function handleCBfileMode(cli: CLI, config: CrossbowConfiguration, reportFn: CrossbowReporter) {

    const createFilePaths  = getRequirePaths(config);
    const input            = require(createFilePaths.valid[0].resolved);

    input.default.config   = processConfigs(_.merge({}, config, input.default.config), cli.flags);
    input.default.cli      = cli;
    input.default.reporter = reportFn;

    if (isCommand(cli.input[0])) {
        return require(availableCommands[cli.input[0]]).default.call(null, cli, input.default, input.default.config, reportFn);
    }

    cli.input = ['run'].concat(cli.input);

    return require(availableCommands['run']).default.call(null, cli, input.default, input.default.config, reportFn);
}

/**
 * Now decide who should handle the current command
 */
function processInput(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration, reportFn: CrossbowReporter): any {
    const firstArg = cli.input[0];
    return require(availableCommands[firstArg]).default.call(null, cli, input, config, reportFn);
}

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

    if (prepared.errors.length) {
        return Rx.Observable.just({
            errors: prepared.errors
        });
    }

    return handleIncoming<any>(prepared);
}


