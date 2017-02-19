#!/usr/bin/env node
import runner = require("./command.run");
import {CrossbowConfiguration, merge, OutgoingSignals} from "./config";
import {getRequirePaths, getBinLookups, Right, Left, getEnvFilesFromDisk} from "./file.utils";
import {getInputs, InputTypes, UserInput} from "./input.resolve";
import * as reports from "./reporter.resolve";
import Rx = require("rx");
import {OutgoingReporter} from "./reporter.resolve";
import {join} from "path";
import {statSync} from "fs";
import {existsSync} from "fs";
import {InputErrorTypes} from "./task.utils";
import {BinDirectoryLookup} from "./reporter.resolve";
import {readdirSync} from "fs";
import {accessSync} from "fs";
import {Reporters} from "./reporter.resolve";
import {addEnvFiles, addEnvFilesToObject} from "./setup.envFile";
import {addBinLookups, addBinLookupsToObject} from "./setup.bin";
const fs = require('fs');

const _ = require("../lodash.custom");
const debug = require("debug")("cb:init");

export interface CLI {
    input: string[];
    flags: any;
    trailing?: string;
    command?: string;
}

export interface CrossbowInput {
    tasks: any;
    watch: any;
    options: any;
    env?: any;
    config?: any;
}

export interface CrossbowReporter {
    (report: reports.IncomingReport): void;
}

const availableCommands = {
    run: "./command.run",
    r: "./command.run",
    tasks: "./command.tasks",
    t: "./command.tasks",
    ls: "./command.tasks",
    watch: "./command.watch",
    w: "./command.watch",
    watchers: "./command.watchers",
    init: "./command.init",
    docs: "./command.docs",
};

const isCommand = (input) => Object.keys(availableCommands).indexOf(input) > -1;

export interface PreparedInputErrors {
    type: reports.ReportTypes;
    data?: any
}

export interface PreparedInput {
    cli: CLI;
    config: CrossbowConfiguration;
    reporters?: Reporters
    reportFn?: CrossbowReporter;
    userInput: UserInput;
    errors: PreparedInputErrors[];
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

    cli.input = ["run"].concat(cli.input);

    return require(availableCommands["run"]).default.call(null, cli, input.default, input.default.config, reportFn);
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
const mergeConfigs = (userInput, merged, flags) =>
    userInput.type !== InputTypes.StubInlineObject && userInput.type !== InputTypes.CBFile
        ? Right(merge(_.merge({}, userInput.inputs[0].config, flags)))
        : Right(merged);

const getConfig = (flags, input) =>
    Right(merge(flags))
        .chain(merged => getUserInput(merged, input)
            .chain(userInput => mergeConfigs(userInput, merged, flags)
                                    .map(config => ({config, userInput})))
        );

const getUserInput = (merged, input) =>
    Right(getInputs(merged, input))
        .chain(userInput => userInput.errors.length
            ? Left({type: reports.ReportTypes.InputError, data: userInput})
            : Right(userInput)
        );

const addReporters = (config) =>
    Right(reports.getReporters(config))
        .chain(reporters =>
            reporters.invalid.length
                ? Left({type: reports.ReportTypes.InvalidReporter, data: {reporters}})
                : Right(reporters.valid)
        );

const getReportFn = reporters => (...args) => reporters.forEach(x => x.callable.apply(null, args));

/**
 * Handle any type of init. It could be from the CLI, or via the API.
 * eg, any command from the CLI ultimately ends up in the following call
 *    $  crossbow run task1 -c conf/cb.js
 *    -> handleIncoming({
 *          input: ['run', 'task1'],
 *          flags: {c: 'conf/cb.js'}
 *       });
 */
export function getSetup (cli: CLI, input?: CrossbowInput) {
    return getConfig(cli.flags, input)
        .chain(setup =>
            addBinLookupsToObject(setup.config)
                .chain(config => addEnvFilesToObject(config))
                .chain(config => addReporters(config)
                    .map(reporters => {
                        return {
                            reporters,
                            config,
                            userInput: setup.userInput,
                            cli,
                            reportFn: getReportFn(reporters)
                        };
                    })))
}

export default function (cli: CLI, input?: CrossbowInput) {

    return getSetup(cli, input)
        .fold(e => {
            return Rx.Observable.just({
                errors: [e]
            });
        }, prepared => {
            return handleIncoming<any>(prepared);
        });
}


