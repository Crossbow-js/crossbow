/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {CrossbowInput, CLI, CrossbowReporter} from './index';
import Immutable = require('immutable');
import Rx = require('rx');
import * as utils from "./task.utils";
import * as fs from "fs";
import {join} from "path";
import {parse} from "path";
import {ReportNames} from "./reporter.resolve";
const _ = require('../lodash.custom');

export enum InitConfigFileErrorTypes {
    InitConfigFileExists = <any>"InitConfigFileExists",
    InitConfigFileTypeNotSupported = <any>"InitConfigFileTypeNotSupported"
}
export interface InitConfigError {type: InitConfigFileErrorTypes}
export interface InitConfigFileExistsError extends InitConfigError {file: utils.ExternalFile}
export interface InitConfigFileTypeNotSupported extends InitConfigError {
    providedType: InitConfigFileTypes,
    supportedTypes: {}
}

export enum InitConfigFileTypes {
    yaml   = <any>"yaml",
    js     = <any>"js",
    json   = <any>"json",
    cbfile = <any>"cbfile"
}

export default function execute(trigger: CommandTrigger): any {
    const {config, reporter} = trigger;

    const templateDir = join(__dirname, '..', 'templates');

    const maybeExistingFileInputs = {
        [InitConfigFileTypes.yaml]: 'crossbow.yaml',
        [InitConfigFileTypes.js]: 'crossbow.js',
        [InitConfigFileTypes.json]: 'crossbow.json',
        [InitConfigFileTypes.cbfile]: 'cbfile.js'
    };

    const outputFileName = maybeExistingFileInputs[config.type];

    if (outputFileName === undefined) {
        const errors = [{
            type: InitConfigFileErrorTypes.InitConfigFileTypeNotSupported,
            providedType: config.type,
            supportedTypes: maybeExistingFileInputs
        }];
        if (!config.handoff) {
            reporter(ReportNames.InitConfigTypeNotSupported, errors[0]);
        }
        return {errors};
    }

    /**
     * Attempt to load existing config files from the CWD
     * @type {ExternalFile[]}
     */
    const existingFilesInCwd = utils.readFilesFromDisk(_.values(maybeExistingFileInputs), config.cwd);

    /**
     * Now check if any of the existing files match the one the user
     * is attempting to create.
     *
     * eg:
     *  crossbow init --type js
     * -> crossbow.js already exists in cwd -> error
     *
     * eg:
     *  crossbow init --type yaml
     * -> crossbow.js already exists in cwd, which is ok because they want a .yaml file -> success
     *
     * @type {ExternalFile[]}
     */
    const matchingFiles = existingFilesInCwd
        .filter(x => x.errors.length === 0)
        .filter(file => outputFileName === file.parsed.base);

    const errors: Array<InitConfigFileExistsError> = (function () {
        if (matchingFiles.length) {
            return matchingFiles.map(file => {
                return {type: InitConfigFileErrorTypes.InitConfigFileExists, file};
            });
        }
        return [];
    })();

    /**
     * Allow consumer to handle executions
     */
    if (config.handoff) {
        return {existingFilesInCwd, matchingFiles, errors};
    }
    
    /**
     * He we perform any IO as we're not 'handing off'
     */
    if (errors.length) {
        reporter(ReportNames.DuplicateConfigFile, errors[0]);
        return {existingFilesInCwd, matchingFiles, errors}; 
    }
    
    const templateFilePath = join(templateDir, outputFileName);
    const outputFilePath   = join(config.cwd, outputFileName);
    
    fs.writeFileSync(outputFilePath,
        fs.readFileSync(templateFilePath)
    );
    
    const output = {
        existingFilesInCwd,
        matchingFiles,
        errors,
        outputFilePath,
        outputFileName
    };

    reporter(ReportNames.ConfigFileCreated, parse(outputFilePath), config.type);
    
    return output; 
}

export function handleIncomingInitCommand(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration, reporter: CrossbowReporter) {
    return execute({
        shared: new Rx.BehaviorSubject(Immutable.Map({})),
        cli,
        input,
        config,
        reporter,
        type: TriggerTypes.command
    });
}
