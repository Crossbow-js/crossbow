import {TaskRunModes} from "./task.resolve";
import {LogLevel} from "./reporters/defaultReporter";
import {OutgoingReport, BinDirectoryLookup} from "./reporter.resolve";
import {resolve} from "path";
import {InitConfigFileTypes} from "./command.init";
import {WatchEvent} from "./watch.file-watcher";
import {ExternalFile, ExternalFileContent} from "./file.utils";

import Rx = require("rx");
import {InputErrorTypes} from "./task.utils";

const _ = require("../lodash.custom");

export enum SignalTypes {
    Exit = <any>"Exit",
    FileWrite = <any>"FileWrite"
}

export interface CBSignal<T> {
    type: SignalTypes;
    data?: T;
}

export type OutgoingSignals = Rx.Subject<CBSignal<ExitSignal|FileWriteSignal>>;

export interface ExitSignal {
    code: number;
}

export interface FileWriteSignal {
    file: ExternalFile;
    content: string;
}

export interface EnvFile {
    path?: string
    file?: ExternalFileContent;
    prefix?: string[]
    errors: StandardError[]
    input: EnvFile|string,
}

export interface StandardError {
    type: InputErrorTypes
}

export interface CrossbowConfiguration {
    cwd: string;
    runMode: TaskRunModes;
    verbose: LogLevel;
    parallel: boolean;
    fail: boolean;
    force: boolean;
    reporter: string;
    handoff: boolean;
    input: string[];
    bin: string[];
    binExecutables: string[];
    binDirectories: BinDirectoryLookup[];
    interactive: boolean;
    outputOnly: boolean;
    suppressOutput: boolean;
    progress: boolean;
    loadDefaultInputs: boolean;
    cbfile?: string;
    dump: boolean;
    envPrefix: string;
    envFile: string[]|EnvFile|EnvFile[];
    envFilePrefix: string[];
    envFiles: EnvFile[];
    env: any;
    before: string[];
    type?: InitConfigFileTypes;
    debug: boolean;
    reporters: Array<string|Function>;
    skip: string[];
    tasksDir: string[];
    nodeModulesPaths: string[];
    block?: boolean;
    debounce?: boolean;
    throttle?: boolean;
    fromJson?: string;

    // docs command
    file?: string;
    output?: string;
    dryRun?: boolean;
    dryRunDuration?: number;

    outputObserver?: Rx.Observable<OutgoingReport>;
    fileChangeObserver?: Rx.Observable<WatchEvent>;
    signalObserver?: OutgoingSignals;
    scheduler?: Rx.IScheduler;
}

/**
 * @type {{cwd: *, runMode: string, resumeOnError: boolean, summary: string, strict: boolean}}
 */
const defaults = <CrossbowConfiguration>{
    /**
     * The current working directory, we never advise changing this
     */
    cwd: process.cwd(),
    /**
     * By default, tasks will wait in line and run when the previous
     * one completes. You can set this to 'parallel' instead
     * if you wish for your code to run as fast as possible
     */
    runMode: <any>"series",
    resumeOnError: false,
    parallel: false,
    input: [],
    bin: [],
    binExecutables: [],
    binDirectories: [],
    /**
     * Dump json to disk for debugging
     */
    dump: false,
    debug: false,
    dryRun: false,
    dryRunDuration: 500,
    force: false,
    /**
     * How much task information should be output
     * following task completion/setup
     */
    verbose: 2, // 2 = normal, 3 = verbose. Maybe will add more later
    /**
     * How should task summaries be output
     */
    reporter: "default",
    /**
     * Will eliminate any crossbow output.
     *
     */
    outputOnly: false,
    /**
     * What to do with child process output
     */
    suppressOutput: false,
    /**
     * Log when tasks start/end
     */
    progress: false,
    /**
     * should the resolved workload be handed off
     * to the caller?
     */
    handoff: false,
    /**
     * Show the prompt for selecting tasks?
     */
    interactive: false,
    /**
     *
     */
    loadDefaultInputs: false,
    /**
     *
     */
    nodeModulesPaths: ["node_modules"],
    /**
     *
     * CI mode - will exit if any shell/npm scripts
     * return a non-zero exit code
     *
     * Should a failing task be allowed to quit the process?
     */
    fail: true,
    /**
     * Crossbow will add all options to your environment vars
     * and will be path-based + prefixed
     * eg:
     *  options: {
     *      docker: {
     *          port: 8000
     *      }
     *  }
     *
     *  ->
     *      CB_DOCKER_PORT=8000
     */
    envPrefix: "cb",
    /**
     *
     */
    envFile: [],
    envFiles: [],
    envFilePrefix: [],
    /**
     * Global ENV vars
     */
    env: {},
    /**
     * Tasks that should be run before any watchers begin
     */
    before: [],

    /**
     * Any tasks that should be skipped
     */
    skip: [],
    /**
     *
     */
    type: InitConfigFileTypes.yaml,
    reporters: [],
    tasksDir: ["tasks"]
};

/**
 * Allow single char flags such as
 *    $ crossbow run task1 task2 -p
 *
 * @type {{p: flagTransforms.p}}
 */
const flagTransforms = {
    /**
     * Take any -e flags and set them
     * on the config.env vars.
     *
     * eg: crossbow run task.js -e PET=kittie
     */
    e: function (opts) {
        opts.e.forEach(inputString => {
            const split = inputString.split("=").map(x => x.trim()).filter(Boolean);
            if (split.length === 2) {
                opts.env[split[0]] = split[1];
            }
        });
        return opts;
    },
    /**
     * If parallel run mode has been set, update the
     * corresponding runMode options too
     */
    parallel: function (opts: any): any {
        if (opts.parallel === true) {
            opts.runMode = TaskRunModes.parallel;
            return opts;
        }
        opts.runMode = TaskRunModes.series;
        return opts;
    },
    cwd: function (opts) {
        opts.cwd = resolve(opts.cwd);
        return opts;
    },
    input: (opts) => {
        if (opts.input && !Array.isArray(opts.input)) {
            opts.input = [opts.input];
        }
        return opts;
    }
};

/**
 * Merge default with incoming opts.
 * Also deal with single char flag
 * @returns {*}
 */
export function merge(opts: CrossbowConfiguration|any): CrossbowConfiguration {

    const newOpts = _.assign({}, defaults, opts);

    return Object.keys(flagTransforms)
        .reduce(function (opts, x) {
            if (opts[x] !== undefined) {
                return flagTransforms[x].call(null, opts);
            }
            return opts;
        }, newOpts);
}
