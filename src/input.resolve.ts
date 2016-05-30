import {CrossbowConfiguration} from "./config";
import * as utils from "./task.utils";
import {CrossbowInput} from "./index";
import {ExternalFileInput} from "./task.utils";
const _ = require('../lodash.custom');

export enum InputTypes {
    DefaultExternalFile = <any>"DefaultExternalFile",
    ExternalFile = <any>"ExternalFile",
    InlineObject = <any>"InlineObject",
    CBFile = <any>"CBFile",
}

export interface UserInput {
    errors: any[],
    sources: utils.ExternalFileInput[],
    type: InputTypes,
    inputs: CrossbowInput[]
}

export function getInputs (config: CrossbowConfiguration, inlineInput?): UserInput {

    /**
     * If the User provided a -c flag we MUST validate this
     * request first as it may fail and then we don't want to continue
     */
    if (config.config.length) {
        const inputs = utils.readInputFiles(config.config, config.cwd);
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
                inputs.valid.reduce((acc, file: ExternalFileInput) => {
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
        const cbfiles = utils.retrieveCBFiles(config);
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
        return {
            type: InputTypes.InlineObject,
            errors: [],
            sources: [],
            inputs: [generateBaseInput(inlineInput)]
        }
    }

    /**
     * At this point, the user has not attempted to load any config files manually
     * so we try to load any defaults that are in the CWD
     */
    const defaultInputputFiles = utils.retrieveDefaultInputFiles(config);
    if (defaultInputputFiles.valid.length) {
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
