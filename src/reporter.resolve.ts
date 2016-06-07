import {CrossbowConfiguration} from "./config";
import {CrossbowInput} from "./index";
import {readInputFiles, readFilesFromDisk, isFunction, isString, ExternalFile} from "./task.utils";
import {join} from "path";

export interface Reporter {
    errors: {}[]
    type: ReporterTypes
    callable?: Function
    sources: ExternalFile[]
}

export enum ReporterErrorTypes {
    ReporterFileNotFound = <any>"ReporterFileNotfound"
}
export interface ReporterError {type: ReporterErrorTypes}
export interface ReporterFileNotFoundError extends ReporterError {
    file: ExternalFile
}
export enum ReporterTypes {
    InlineFunction = <any>"InlineFunction",
    ExternalFile = <any>"ExternalFile"
}

export interface Reporters {
    all: Reporter[]
    valid: Reporter[]
    invalid: Reporter[]
}

export enum ReportNames {
    TaskTree          = <any> "TaskTree",
    InvalidReporter   = <any>"InvalidReporter",
    UsingConfigFile   = <any>"UsingConfigFile",
    InputFileNotFound = <any>"InputFileNotFound",
    SimpleTaskList    = <any>"SimpleTaskList",
    NoTasksAvailable  = <any>"NoTasksAvailable",
}

export function getReporters (config: CrossbowConfiguration, input: CrossbowInput): Reporters {

    const reporters = [].concat(config.reporters).map(function (reporter) {
        if (typeof reporter === 'function') {
            return {
                type: ReporterTypes.InlineFunction,
                callable: reporter,
                errors: [],
                sources: []
            }
        }
        if (typeof reporter === 'string') {
            const files = readFilesFromDisk([reporter], config.cwd);
            const errors = files
                .reduce((acc, item) => {
                    // Convert errors from reading files
                    // into errors about reporters
                    if (item.errors.length) {
                        return acc.concat({
                            type: ReporterErrorTypes.ReporterFileNotFound,
                            file: item
                        })
                    }
                    return acc;
                }, []);
            if (errors.length) {
                return {
                    type: ReporterTypes.ExternalFile,
                    errors: errors,
                    sources: files
                }
            }
            const callable = require(files[0].resolved);
            return {
                type: ReporterTypes.ExternalFile,
                callable: callable,
                errors: [],
                sources: files
            }
        }
    });

    return {
        all: reporters,
        valid: reporters.filter(x => x.errors.length === 0),
        invalid: reporters.filter(x => x.errors.length > 0)
    }
}

export function getDefaultReporter () {
    return require('./reporters/defaultReporter').default;
}
