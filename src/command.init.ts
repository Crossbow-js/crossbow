/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {CrossbowInput, CLI} from './index';
import Immutable = require('immutable');
import Rx = require('rx');
import {readInputFiles, ExternalFileInput, readFilesFromDisk, ExternalFile} from "./task.utils";
import {join} from "path";

export enum InitConfigFileErrorTypes {
    InitConfigFileExists = <any>"InitConfigFileExists"
}
export interface InitConfigError {type: InitConfigFileErrorTypes}
export interface InitConfigFileExistsError extends InitConfigError {file: ExternalFile}

export enum InitConfigFileTypes {
    yaml   = <any>"yaml",
    js     = <any>"js",
    json   = <any>"json",
    cbfile = <any>"cbfile"
}

export default function execute(trigger: CommandTrigger): any {
    const {input, config} = trigger;

    const templateDir = join(__dirname, '..', 'templates');
    const maybeExistingFileInputs = {
        'crossbow.yaml': InitConfigFileTypes.yaml,
        'crossbow.js': InitConfigFileTypes.js,
        'crossbow.json': InitConfigFileTypes.json,
        'cbfile.js': InitConfigFileTypes.cbfile,
    };

    if (InitConfigFileTypes[config.type] === undefined) {
        // InitConfigFileTypeNotSupported error
        console.log('not supported');
        return;
    }

    /**
     * Attempt to load existing config files from the CWD
     * @type {ExternalFile[]}
     */
    const existingFiles = readFilesFromDisk(Object.keys(maybeExistingFileInputs), config.cwd);

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
    const matchingFiles = existingFiles
        .filter(x => x.errors.length === 0)
        .filter(function (file) {
            return maybeExistingFileInputs[file.parsed.base] === config.type;
        });

    const errors: Array<InitConfigFileExistsError> = (function () {
        if (matchingFiles.length) {
            return matchingFiles.map(file => {
                return {type: InitConfigFileErrorTypes.InitConfigFileExists, file};
            });
        }
        return [];
    })();

    if (config.handoff) {
        return {existingFiles, matchingFiles, errors};
    }

    

    return {existingFiles, matchingFiles, errors};
}

export function handleIncomingInitCommand(cli: CLI, input: CrossbowInput, config: CrossbowConfiguration) {
    return execute({
        shared: new Rx.BehaviorSubject(Immutable.Map({})),
        cli,
        input,
        config,
        type: TriggerTypes.command
    });
}
