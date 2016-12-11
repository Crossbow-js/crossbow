import {CrossbowInput} from "./index";
import {CrossbowConfiguration} from "./config";

import * as utils from "./task.utils";
import * as file from "./file.utils";
import {InputErrorTypes} from "./task.utils";

const debug = require('debug')('cb:input');
const _ = require('../lodash.custom');

export enum InputTypes {
    DefaultExternalFile = <any>"DefaultExternalFile",
    ExternalFile = <any>"ExternalFile",
    InlineObject = <any>"InlineObject",
    CBFile = <any>"CBFile",
}

export interface UserInput {
    errors: any[],
    sources: file.ExternalFileInput[],
    type: InputTypes,
    inputs: CrossbowInput[]
}

export function getInputs (config: CrossbowConfiguration, inlineInput?): UserInput {

    /**
     * If the User provided a -c flag we MUST validate this
     * request first as it may fail and then we don't want to continue
     */
    if (config.config.length) {
        debug(`config flag provided ${config.config}`);
        const inputs = file.readInputFiles(config.config, config.cwd);
        if (inputs.invalid.length) {
            return {
                type: InputTypes.ExternalFile,
                errors: inputs.invalid.map(x => x.errors[0]),
                sources: inputs.invalid,
                inputs: [],
            }
        }
        return {
            type: InputTypes.ExternalFile,
            errors: [],
            sources: inputs.valid,
            inputs: [
                /**
                 * Merged all given configs into a single obj
                 * This is to allow, for example, production
                 * configuration to override dev etc..
                 */
                inputs.valid.reduce((acc, file: file.ExternalFileInput) => {
                    return _.merge(acc, generateBaseInput(file.input));
                }, {})
            ],
        }
    }

    /**
     * If the User provided --cbfile flag we MUST validate this
     * request first as it may fail and then we don't want to continue
     */
    if (config.cbfile) {
        debug(`'cbfile' flag provided ${config.cbfile}`);
        const cbfiles = file.retrieveCBFiles(config);
        if (cbfiles.invalid.length) {
            return {
                type: InputTypes.CBFile,
                errors: cbfiles.invalid.map(x => x.errors[0]),
                sources: cbfiles.invalid,
                inputs: [],
            };
        }
        return {
            type: InputTypes.CBFile,
            errors: [],
            sources: cbfiles.valid,
            inputs: [],
        }
    }

    /**
     * Crossbow may be used with a simple object literal input.
     * This is how the test suit is even possible in such a system
     */
    if (utils.isPlainObject(inlineInput)) {
        debug(`plain object given as input ${JSON.stringify(inlineInput)}`);
        return {
            type: InputTypes.InlineObject,
            errors: [],
            sources: [],
            inputs: [generateBaseInput(inlineInput)]
        }
    }

    /**
     * Finally, try any cbfiles in the cwd
     */
    const defaultCbFiles  = file.retrieveCBFiles(config);

    /**
     * If a cbfile.js **was** found in the current
     * directory, it will have been 'required' and therefor
     * some code will have run, which may of errored.
     * So here we check for that possible error by
     * filtering out `InputFileNotFound` errors (which simply mean
     * a cbfile.js was not found anyway.
     */
    const inputErrors = defaultCbFiles.invalid.filter(x => x.errors[0].type !== InputErrorTypes.InputFileNotFound);
    if (inputErrors.length) {
        return {
            type: InputTypes.CBFile,
            errors: inputErrors.map(x => x.errors[0]),
            sources: inputErrors,
            inputs: [],
        };
    }

    if (defaultCbFiles.valid.length) {
        debug(`Default cbfile found ${defaultCbFiles.valid[0].resolved}`);
        return {
            errors: [],
            type: InputTypes.CBFile,
            sources: defaultCbFiles.valid,
            inputs: []
        }
    }

    /**
     * At this point, the user has not attempted to load any config files manually
     * so we try to load any defaults that are in the CWD
     */
    const defaultInputputFiles = file.retrieveDefaultInputFiles(config);
    const notMissingFileErrors = defaultInputputFiles.invalid
        .filter(x => x.errors[0].type !== InputErrorTypes.InputFileNotFound);

    if (notMissingFileErrors.length) {
        debug(`Default input found with errors ${notMissingFileErrors[0].resolved}`);
        return {
            errors: notMissingFileErrors.reduce((acc, x) => acc.concat(x.errors), []),
            type: InputTypes.DefaultExternalFile,
            sources: notMissingFileErrors,
            inputs: []
        }
    }

    if (defaultInputputFiles.valid.length) {
        debug(`Default input found ${defaultInputputFiles.valid[0].resolved}`);
        return {
            errors: [],
            type: InputTypes.DefaultExternalFile,
            sources: defaultInputputFiles.valid,
            inputs: [generateBaseInput(defaultInputputFiles.valid[0].input)]
        }
    }

    /**
     * If we reach this point, we're working with
     * 1. NO external input files
     * 2. NO inline Object literal
     *
     * Which means we just need the stub objects, enough
     * to allow the system to work.
     */
    debug(`No external input given/found, using default`);
    return {
        errors: [],
        sources: [],
        type: InputTypes.InlineObject,
        inputs: [generateBaseInput({})]
    }
}

/**
 * `Input` is the object that is looked at to resolve tasks/options and
 * watchers
 */
export function generateBaseInput(incoming: CrossbowInput|any): CrossbowInput {

    return _.merge({
        tasks: {},
        watch: {
            before: [],
            options: {}
        },
        options: {},
        env: {}
    }, incoming || {});
}
