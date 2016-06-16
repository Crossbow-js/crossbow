import {CrossbowConfiguration} from "./config";
import {CrossbowInput} from "./index";
import {readFilesFromDisk, ExternalFile} from "./task.utils";

export interface Reporter {
    errors: {}[]
    type: ReporterTypes
    callable?: Function
    sources: ExternalFile[]
}

export enum ReporterErrorTypes {
    ReporterFileNotFound = <any>"ReporterFileNotfound",
    ReporterTypeNotSupported = <any>"ReporterTypeNotSupported"
}
export interface ReporterError {type: ReporterErrorTypes, file?: ExternalFile}
export interface ReporterFileNotFoundError extends ReporterError {}
export interface ReporterTypeNotSupportedError extends ReporterError {}
export enum ReporterTypes {
    InlineFunction = <any>"InlineFunction",
    ExternalFile = <any>"ExternalFile",
    UnsupportedValue = <any>"UnsupportedValue"
}

export interface Reporters {
    all: Reporter[]
    valid: Reporter[]
    invalid: Reporter[]
}

export enum ReportNames {
    DuplicateConfigFile            = <any>"DuplicateConfigFile",
    ConfigFileCreated              = <any>"ConfigFileCreated",
    InitConfigTypeNotSupported     = <any>"InitConfigTypeNotSupported",
    InputFileNotFound              = <any>"InputFileNotFound",
    InvalidReporter                = <any>"InvalidReporter",
    UsingConfigFile                = <any>"UsingConfigFile",

    TaskList                       = <any>"TaskList",
    TaskTree                       = <any>"TaskTree",
    TaskErrors                     = <any>"TaskErrors",
    TaskReport                     = <any>"TaskReport",

    InvalidTasksSimple             = <any>"InvalidTasksSimple",
    NoTasksAvailable               = <any>"NoTasksAvailable",
    NoTasksProvided                = <any>"NoTasksProvided",

    SimpleTaskList                 = <any>"SimpleTaskList",
    BeforeWatchTaskErrors          = <any>"BeforeWatchTaskErrors",
    BeforeTaskList                 = <any>"BeforeTaskList",
    BeforeTasksDidNotComplete      = <any>"BeforeTasksDidNotComplete",
    WatchTaskTasksErrors           = <any>"WatchTaskTasksErrors",
    WatchTaskErrors                = <any>"WatchTaskErrors",
    WatchTaskReport                = <any>"WatchTaskReport",
    NoFilesMatched                 = <any>"NoFilesMatched",
    NoWatchersAvailable            = <any>"NoWatchersAvailable",
    NoWatchTasksProvided           = <any>"NoWatchTasksProvided",
    Watchers                       = <any>"Watchers",
    WatcherNames                   = <any>"WatcherNames",
    WatcherTriggeredTasksCompleted = <any>"WatcherTriggeredTasksCompleted",
    WatcherTriggeredTasks          = <any>"WatcherTriggeredTasks",

    DocsAddedToFile                = <any>"DocsAddedToFile",
    DocsGenerated                  = <any>"DocsMarkdownGenerated",
    DocsInputFileNotFound          = <any>"DocsInputFileNotFound",

    Summary                        = <any>"Summary",
}

export function getReporters (config: CrossbowConfiguration, input: CrossbowInput): Reporters {

    const reporters = [].concat(config.reporters).map(getOneReporter);

    return {
        all: reporters,
        valid: reporters.filter(x => x.errors.length === 0),
        invalid: reporters.filter(x => x.errors.length > 0)
    };

    function getOneReporter(reporter): Reporter {
        /**
         * If a function was given as a reported (eg: inline)
         * then it's ALWAYS a valid reporter
         */
        if (typeof reporter === 'function') {
            return {
                type: ReporterTypes.InlineFunction,
                callable: reporter,
                errors: [],
                sources: []
            }
        }
        /**
         * If the reporter was not a string or function
         * it's definitely an unsupported type
         */
        if (typeof reporter !== 'string') {
            return {
                type: ReporterTypes.UnsupportedValue,
                errors: [{type: ReporterErrorTypes.ReporterTypeNotSupported}],
                sources: [reporter]
            }
        }

        const files = readFilesFromDisk([reporter], config.cwd);
        const errors = files
            .reduce((acc, item) => {
                // Convert errors from reading files
                // into errors about reporters
                // This is for correct context in logging
                if (item.errors.length) {
                    return acc.concat({
                        type: ReporterErrorTypes.ReporterFileNotFound,
                        file: item
                    })
                }
                return acc;
            }, []);

        /**
         * If any errors occurred, return them
         */
        if (errors.length) {
            return {
                type: ReporterTypes.ExternalFile,
                errors: errors,
                sources: files
            }
        }

        /**
         * Now try to 'require' the module. If it
         * does not contain a default export, create an error
         */
        const callable = require(files[0].resolved);
        if (typeof callable !== "function") {
            return {
                type: ReporterTypes.UnsupportedValue,
                errors: [{type: ReporterErrorTypes.ReporterTypeNotSupported}],
                sources: [files[0]]
            }
        }

        /**
         * Here we have a valid external file to return
         * as a single reporter
         */
        return {
            type: ReporterTypes.ExternalFile,
            callable: callable,
            errors: [],
            sources: files
        }
    }
}

export function getDefaultReporter () {
    return require('./reporters/defaultReporter').default;
}
