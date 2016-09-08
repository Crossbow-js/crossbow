/// <reference path="../node_modules/immutable/dist/immutable.d.ts" />
import {TaskRunModes} from "./task.resolve";
import {LogLevel, OutgoingReport} from "./reporters/defaultReporter";
import {resolve} from "path";
import {InitConfigFileTypes} from "./command.init";
import {join} from "path";

const _ = require('../lodash.custom');

export interface CrossbowConfiguration {
    cwd: string
    runMode: TaskRunModes
    verbose: LogLevel
    parallel: boolean
    fail: boolean
    force: boolean
    reporter: string
    handoff: boolean
    config: string[]
    interactive: boolean
    outputOnly: boolean
    suppressOutput: boolean
    progress: boolean
    cbfile?: string
    dump: boolean
    envPrefix: string
    env: any
    before: string[]
    type?: InitConfigFileTypes
    debug: boolean
    reporters: Array<string|Function>
    skip: string[]
    tasksDir: string[]

    // docs command
    file?: string
    output?: string
    dryRun?: boolean
    dryRunDuration?: number
    outputObserver?: Rx.Observable<OutgoingReport>
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
    runMode: TaskRunModes.series,
    resumeOnError: false,
    parallel: false,
    config: [],
    /**
     * Dump json to disk for debugging
     */
    dump: false,
    debug: false,
    dryRun: false,
    dryRunDuration: 1000,
    force: false,
    /**
     * How much task information should be output
     * following task completion/setup
     */
    verbose: 2, // 2 = normal, 3 = verbose. Maybe will add more later
    /**
     * How should task summaries be output
     */
    reporter: 'default',
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
    envPrefix: 'cb',
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
    tasksDir: ['tasks']
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
        opts.e.forEach(string => {
            const split = string.split('=').map(x => x.trim()).filter(Boolean);
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
    config: (opts) => {
        if (opts.config && !Array.isArray(opts.config)) {
            opts.config = [opts.config];
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
