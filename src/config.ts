/// <reference path="../node_modules/immutable/dist/immutable.d.ts" />
import {Map, List, fromJS, Iterable} from 'immutable';

interface CrossbowConfiguration {
    logLevel?: string
    cwd?: string
    runMode?: string
    resumeOnError?: boolean
    exitOnError?: boolean
    summary?: string
    strict?: boolean
    stack?: boolean
    reporter?: string
}
/**
 * @type {{cwd: *, runMode: string, resumeOnError: boolean, summary: string, strict: boolean}}
 */
const defaults = <CrossbowConfiguration>{
    logLevel: "info",
    /**
     * The current working directory, we never advise changing this
     */
    cwd: process.cwd(),
    /**
     * By default, tasks will wait in line and run when the previous
     * one completes. You can set this to 'parallel' instead
     * if you wish for your code to run as fast as possible
     */
    runMode: 'series',
    resumeOnError: false,
    /**
     * CI mode - will exit if any shell/npm scripts
     * return a non-zero exit code
     */
    exitOnError: false,
    /**
     * How much task information should be output
     * following task completion/setup
     */
    summary: 'short', // 'short', 'long', 'verbose'
    /**
     * Force config file etc
     */
    strict: false,

    /**
     * Should logged errors produce a stack trace
     */
    stack: false,
    /**
     * How should task summaries be output
     */
    reporter: 'default'
};

/**
 * Allow single char flags such as
 *    $ crossbow run task1 task2 -p
 *
 * @type {{p: flagTransforms.p}}
 */
const flagTransforms = {
    /**
     * -p changes 'runMode' from series to parallel
     * @param {Immutable.Map} opts
     * @returns {Immutable.Map}
     */
    p: (opts) => {
        return opts.update('runMode', () => 'parallel');
    },
    /**
     * @param {Immutable.Map} opts
     * @returns {Immutable.Map}
     */
    s: (opts) => {
        return opts.update('strict', () => true);
    },
    /**
     * @param {Immutable.Map} opts
     * @returns {Immutable.Map}
     */
    e: (opts) => {
        return opts.update('exitOnError', () => true);
    }
};

/**
 * Merge default with incoming opts.
 * Also deal with single char flag
 * @returns {*}
 */
export function merge (opts: CrossbowConfiguration) {

    const newOpts = fromJS(defaults).mergeDeep(opts);

    return Object.keys(flagTransforms)
        .reduce(function (opts, x) {
            if (opts.has(x)) {
                return flagTransforms[x].call(null, opts);
            }
            return opts;
    }, newOpts);
}
