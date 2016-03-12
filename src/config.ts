/// <reference path="../node_modules/immutable/dist/immutable.d.ts" />
const assign  = require('object-assign');

export interface CrossbowConfiguration {
    logLevel: string
    cwd: string
    runMode: string
    resumeOnError: boolean
    exitOnError: boolean
    summary: string
    strict: boolean
    stack: boolean
    reporter: string
    handoff: boolean
    config: string|void
    interactive: boolean
    suppressOutput: boolean
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
    exitOnError: true,
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
    reporter: 'default',
    /**
     *
     */
    suppressOutput: false,
    /**
     * should the resolved workload be handed off
     * to the caller?
     */
    handoff: false,
    /**
     * Show the prompt for selecting tasks?
     */
    interactive: false
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
     */
    p: (opts) => {
        return assign({}, opts, {runMode: 'parallel'});
    },
    /**
     * -c specifies a config file
     */
    c: (opts) => {
        if (typeof opts.c !== 'string') {
            return opts;
        }
        return assign({}, opts, {config: opts.c});
    },
    /**
     * -c specifies a config file
     */
    v: (opts) => {
        return assign({}, opts, {summary: 'verbose'});
    }
};

/**
 * Merge default with incoming opts.
 * Also deal with single char flag
 * @returns {*}
 */
export function merge (opts: CrossbowConfiguration|any) : CrossbowConfiguration {

    const newOpts = assign({}, defaults, opts);

    return Object.keys(flagTransforms)
        .reduce(function (opts, x) {
            if (opts[x] !== undefined) {
                return flagTransforms[x].call(null, opts);
            }
            return opts;
        }, newOpts);
}
