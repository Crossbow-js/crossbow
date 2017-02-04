import {CrossbowInput} from "./index";
import {CrossbowConfiguration} from "./config";

import * as utils from "./task.utils";
import * as file from "./file.utils";
import {InputErrorTypes} from "./task.utils";
import Rx = require("rx");
import {isPlainObject} from "./task.utils";

const debug = require("debug")("cb:input");
const _ = require("../lodash.custom");

export enum InputTypes {
    DefaultExternalFile = <any>"DefaultExternalFile",
    ExternalFile = <any>"ExternalFile",
    InlineObject = <any>"InlineObject",
    StubInlineObject = <any>"StubInlineObject",
    CBFile = <any>"CBFile",
    InlineJSON = <any>"InlineJSON",
}

export interface UserInput {
    errors: any[];
    sources: file.ExternalFileInput[];
    type: InputTypes;
    inputs: CrossbowInput[];
}

export function getInputs (config: CrossbowConfiguration, inlineInput?: any): UserInput {

    /**
     * If the User provided a -c flag we MUST validate this
     * request first as it may fail and then we don't want to continue
     */
    if (config.input.length) {
        debug(`config flag provided ${config.input}`);

        const stringInputs     = config.input.filter(x => typeof x === "string");
        const inlineInputs     = config.input.filter(x => isPlainObject(x));

        const fileInputs       = file.readInputFiles(stringInputs, config.cwd);
        const mergedFileInputs = fileInputs.valid.map(file => file.input);
        const mergedInputs     = _.merge(generateBaseInput({}), ...mergedFileInputs, ...inlineInputs, inlineInput);

        if (fileInputs.invalid.length) {
            return {
                type: InputTypes.ExternalFile,
                errors: fileInputs.invalid.map(x => x.errors[0]),
                sources: fileInputs.invalid,
                inputs: [],
            };
        }

        return {
            type: InputTypes.ExternalFile,
            errors: [],
            sources: fileInputs.valid,
            inputs: [
                /**
                 * Merged all given configs into a single obj
                 * This is to allow, for example, production
                 * configuration to override dev etc..
                 */
                mergedInputs
            ],
        };
    }

    if (config.fromJson) {
        try {
            const parsed = JSON.parse(config.fromJson);
            return {
                errors: [],
                sources: [],
                type: InputTypes.InlineJSON,
                inputs: [generateBaseInput(parsed)]
            };
        } catch (e) {
            return {
                errors: [{type: InputErrorTypes.InvalidJson, json: config.fromJson, error: e}],
                sources: [],
                type: InputTypes.InlineJSON,
                inputs: []
            };
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
        };
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
        };
    }

    if (!config.loadDefaultInputs) {
        debug(`config.loadDefaultInputs = false, not looking for default file types`);
        return {
            errors: [],
            sources: [],
            type: InputTypes.StubInlineObject,
            inputs: [generateBaseInput({})]
        };
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
    const inputErrors = defaultCbFiles.invalid
        .filter(x => x.errors[0].type !== InputErrorTypes.InputFileNotFound);

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
        };
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
        };
    }

    if (defaultInputputFiles.valid.length) {
        debug(`Default input found ${defaultInputputFiles.valid[0].resolved}`);
        return {
            errors: [],
            type: InputTypes.DefaultExternalFile,
            sources: defaultInputputFiles.valid,
            inputs: [generateBaseInput(defaultInputputFiles.valid[0].input)]
        };
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
    };
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
