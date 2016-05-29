/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {CrossbowInput, CLI} from './index';
import Immutable = require('immutable');
import Rx = require('rx');
import {readInputFiles, ExternalFileInput, readFilesFromDisk, ExternalFile} from "./task.utils";
import {join} from "path";
import {readFileSync} from "fs";
import {writeFileSync} from "fs";
const _ = require('../lodash.custom');

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
        [InitConfigFileTypes.yaml]: 'crossbow.yaml',
        [InitConfigFileTypes.js]: 'crossbow.js',
        [InitConfigFileTypes.json]: 'crossbow.json',
        [InitConfigFileTypes.cbfile]: 'cbfile.js'
    };

    const fileTypeSelection = maybeExistingFileInputs[config.type];

    if (fileTypeSelection === undefined) {
        // InitConfigFileTypeNotSupported error
        console.log('not supported');
        return;
    }

    /**
     * Attempt to load existing config files from the CWD
     * @type {ExternalFile[]}
     */
    const existingFilesInCwd = readFilesFromDisk(_.values(maybeExistingFileInputs), config.cwd);

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
        .filter(file => fileTypeSelection === file.parsed.base);

    const errors: Array<InitConfigFileExistsError> = (function () {
        if (matchingFiles.length) {
            return matchingFiles.map(file => {
                return {type: InitConfigFileErrorTypes.InitConfigFileExists, file};
            });
        }
        return [];
    })();

    if (config.handoff) {
        return {existingFilesInCwd, matchingFiles, errors};
    }

    /**
     * He we perform any IO as we're not 'handing off'
     */
    if (errors.length) {

    } else {
        writeFileSync(join(config.cwd, fileTypeSelection),
            readFileSync(join(templateDir, fileTypeSelection))
        );
    }

    return {existingFilesInCwd, matchingFiles, errors};
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
