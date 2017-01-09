
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {CrossbowInput, CLI, CrossbowReporter} from './index';
import Immutable = require('immutable');
import Rx = require('rx');
import * as file from "./file.utils";
import * as fs from "fs";
import {join, parse} from "path";
import {ReportTypes} from "./reporter.resolve";
import {
    DuplicateConfigFile, ConfigFileCreatedReport,
    InitInputFileTypeNotSupportedReport
} from "./reporter.resolve";
import {ExternalFile} from "./file.utils";
const _ = require('../lodash.custom');

export enum InitConfigFileErrorTypes {
    InitInputFileExists = <any>"InitInputFileExists",
    InitInputFileTypeNotSupported = <any>"InitInputFileTypeNotSupported"
}
export interface InitConfigError {type: InitConfigFileErrorTypes}
export interface InitConfigFileExistsError extends InitConfigError {file: file.ExternalFile}
export interface InitConfigFileTypeNotSupported extends InitConfigError {
    providedType: InitConfigFileTypes,
    supportedTypes: {}
}

export interface InitCommandOutput {
    existingFilesInCwd: ExternalFile[]
    matchingFiles: ExternalFile[]
    errors: InitConfigError[]
    outputFilePath?: string
    outputFileName?: string
    templateFilePath?: string
}
export type InitCommandComplete = Rx.Observable<{setup:InitCommandOutput}>;

export enum InitConfigFileTypes {
    yaml   = <any>"yaml",
    js     = <any>"js",
    json   = <any>"json",
    cbfile = <any>"cbfile"
}

function execute(trigger: CommandTrigger): InitCommandComplete {
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
            type: InitConfigFileErrorTypes.InitInputFileTypeNotSupported,
            providedType: config.type,
            supportedTypes: maybeExistingFileInputs
        }];
        if (!config.handoff) {
            reporter({
                type: ReportTypes.InitInputFileTypeNotSupported,
                data: {
                    error: errors[0]
                } as InitInputFileTypeNotSupportedReport
            });
        }
        return Rx.Observable.just({
            setup: {
                existingFilesInCwd: [],
                matchingFiles: [],
                errors
            }
        });
    }

    /**
     * Attempt to load existing config files from the CWD
     * @type {ExternalFile[]}
     */
    const existingFilesInCwd = file.readFilesFromDisk(_.values(maybeExistingFileInputs), config.cwd);

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
                return {type: InitConfigFileErrorTypes.InitInputFileExists, file};
            });
        }
        return [];
    })();

    // /**
    //  * Allow consumer to handle executions
    //  */
    // if (config.handoff) {
    //     return Rx.Ob{existingFilesInCwd, matchingFiles, errors};
    // }



    if (errors.length) {
        reporter({
            type: ReportTypes.DuplicateInputFile,
            data: {
                error: errors[0]
            } as DuplicateConfigFile
        });

        return Rx.Observable.just({
            setup: {
                existingFilesInCwd,
                matchingFiles,
                errors
            }
        });
    }

    const templateFilePath = join(templateDir, outputFileName);
    const outputFilePath   = join(config.cwd, outputFileName);

    const output = {
        existingFilesInCwd,
        matchingFiles,
        errors,
        outputFilePath,
        outputFileName,
        templateFilePath
    };

    reporter({
        type: ReportTypes.InputFileCreated,
        data: {
            parsed: parse(outputFilePath)
        } as ConfigFileCreatedReport
    });

    return Rx.Observable.just({setup: output});
}

export default function handleIncomingInitCommand(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration, reporter: CrossbowReporter) {
    return execute({
        shared: new Rx.BehaviorSubject(Immutable.Map({})),
        cli,
        input,
        config,
        reporter,
        type: TriggerTypes.command
    });
}
