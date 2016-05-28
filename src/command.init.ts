/// <reference path="../typings/main.d.ts" />
import {CommandTrigger, TriggerTypes} from './command.run';
import {CrossbowConfiguration} from './config';
import {CrossbowInput, CLI} from './index';
import Immutable = require('immutable');
import Rx = require('rx');
import {readFiles, ExternalFileInput} from "./task.utils";

export enum InitConfigFileErrorTypes {
    InitConfigFileExists = <any>"InitConfigFileExists"
}
export interface InitConfigError {type: InitConfigFileErrorTypes}
export interface InitConfigFileExistsError extends InitConfigError {file: ExternalFileInput}

export enum InitConfigFileTypes {
    yaml   = <any>"yaml",
    js     = <any>"js",
    json   = <any>"json",
    cbfile = <any>"cbfile"
}

export default function execute(trigger: CommandTrigger): any {
    const {input, config} = trigger;

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

    const existingFiles = readFiles(Object.keys(maybeExistingFileInputs), config.cwd);
    const matchingFiles = existingFiles.valid.filter(function (file) {
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
    // console.log(config.type);
    // reportTaskTree(resolveTasks(Object.keys(input.tasks), trigger).all, config, 'Available tasks:', true);
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
