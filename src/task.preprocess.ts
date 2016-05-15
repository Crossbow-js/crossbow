import {Task} from "./task.resolve.d";
import {CrossbowInput} from "./index";
import {TaskRunModes, createAdaptorTask, TaskOriginTypes, TaskTypes, CBFunction} from "./task.resolve";
import {isString} from "./task.utils";

const assign = require('object-assign');
const qs = require('qs');
const flagRegex = /(.+?)@(.+)?$/;
export const removeNewlines = (x: string) => x.replace(/\n|\r/g, '').trim();

export interface IncomingTask {
    baseTaskName: string
    subTasks: string[]
    rawInput: string
    taskName: string
    flags: {}
    cbflags: string[]
    modules?: string[]
    tasks?: Task[]
    inlineFunctions: any[]
    query: any
}

let inlineFnCount = 0;

export function preprocessTask(taskName: string|CBFunction, input: CrossbowInput, parents: string[]): Task {

    /**
     * Never modify the current task if it begins
     * with a `@` - instead just return early with
     * a adaptors task
     *  eg: `@npm webpack`
     */
    if (isString(taskName)) {
        const adaptorName = <string>taskName;
        if (adaptorName.match(/^@/)) {
            return createAdaptorTask(adaptorName, parents);
        }
    }
    
    if (typeof taskName === 'function') {
        const fnName = taskName.name;
        const out: CBFunction = taskName;
        const identifier = `_inline_fn_${inlineFnCount++}_` + fnName;
        return {
            cbflags: [],
            query:   {},
            flags:   {},
            baseTaskName: identifier,
            subTasks: [],
            taskName: identifier,
            rawInput: identifier,
            tasks:    [],
            runMode: TaskRunModes.series,
            inlineFunctions: [out],
            valid: true,
            modules: [],
            parents: parents,
            errors: [],
            origin: TaskOriginTypes.InlineFunction,
            type: TaskTypes.InlineFunction
        };
    }

    /**
     * Split any end cbflags from the main task name
     * @type {SplitTaskAndFlags}
     */
    var split = getSplitFlags(<string>taskName, input);

    /**
     * Split the incoming taskname on colons
     *  eg: sass:site:dev
     *  ->  ['sass', 'site', 'dev']
     * @type {Array}
     */
    const splitTask = split.taskName.split(':');

    /**
     * Take the first (or the only) item as the base task name
     *  eg: uglify:*
     *  ->  'uglify'
     * @type {string}
     */
    const baseTaskName = splitTask[0];
    const subTasks = splitTask.slice(1);

    /**
     * Create the base task
     * @type {IncomingTask}
     */
    const incomingTask = <IncomingTask>{
        cbflags: split.cbflags,
        query: split.query,
        flags: split.flags,
        baseTaskName,
        subTasks,
        taskName: baseTaskName,
        rawInput: <string>taskName,
        tasks: [],
        inlineFunctions: []
    };

    /**
     * Now pass it off to allow any flags to applied
     */
    return processFlags(incomingTask);
}

function createIncomingTask() {

}

export interface SplitTaskAndFlags {
    taskName: string
    cbflags: string[]
    flags: {}
    query: any
}

/**
 *
 */
function getSplitFlags(taskName: string, input: CrossbowInput): SplitTaskAndFlags {

    /**
     * Split up the task name from any flags/queries/cbflags etc
     * @type {{baseName: string, flags: {}}}
     */
    const baseNameAndFlags = getBaseNameAndFlags(taskName);

    /**
     * Split tasks based on whether or not they have flags
     *    eg: crossbow run '@npm run webpack@p'
     *    ->  taskName: '@npm run webpack'
     *    ->  cbflags: ['p']
     * @type {RegExpMatchArray}
     */
    const splitCBFlags = baseNameAndFlags.baseName.match(flagRegex);

    /**
     * If splitFlags is falsey, there was no flag so return
     * an empty array and the full task name
     */
    if (!splitCBFlags) {
        const splitQuery = baseNameAndFlags.baseName.split('?');
        const query = splitQuery.length > 1
            ? qs.parse(splitQuery[1])
            : {};

        /**
         * Next, look at the top-level input,
         * is this taskname going to match, and if so, does it contain any flags?
         */
        const cbflags = Object.keys(input.tasks).reduce(function (all, key) {
            const match = key.match(new RegExp(`^${taskName}@(.+)`));
            if (match) {
                return all.concat(match[1].split(''));
            }
            return all;
        }, []);

        return {taskName: splitQuery[0], query, cbflags: cbflags, flags: baseNameAndFlags.flags};
    }

    /**
     * At this point, there was at LEAST an @ at the end of the task name
     * @type {string}
     */
    const base = splitCBFlags[1];
    const splitQuery = base.split('?');
    const query = splitQuery.length > 1
        ? qs.parse(splitQuery[1])
        : {};

    /**
     * If the 3rd item in the regex match is undefined, it means
     * the @ was used at the end of the task name, but a value was not given.
     * In that case we return an empty string to allow the error collection
     * to kick in later
     * @type {string[]}
     */
    const cbflags = splitCBFlags[2] === undefined
        ? ['']
        /**
         * Default case is where there are chars after the @, so we split them up
         *   eg: crossbow run '@npm run webpack@pas'
         *   ->  flags: ['p', 'a', 's']
         */
        : splitCBFlags[2].split('');
    return {
        taskName: splitQuery[0],
        query,
        cbflags,
        flags: baseNameAndFlags.flags
    };
}

/**
 * Apply any transformations to options based on
 * CB flags
 * @param incoming
 * @returns {any}
 */
function processFlags(incoming: IncomingTask): Task {

    const runMode = (function () {
        if (incoming.cbflags.indexOf('p') > -1) {
            return TaskRunModes.parallel;
        }
        return TaskRunModes.series;
    })();

    return assign({}, incoming, {
        runMode
    });
}

/**
 * Strip any underscore commands from parsed args
 * @param obj
 * @returns {{}}
 */
function withoutCommand(obj: {}) {
    if (!Object.keys(obj).length) {
        return {};
    }
    return Object.keys(obj).reduce(function (acc, key) {
        if (key !== "_") {
            acc[key] = obj[key];
        }
        return acc;
    }, {});
}

/**
 * Split basename + opts
 * @param taskName
 * @returns {{baseName: any, flags: {}}}
 */
function getBaseNameAndFlags(taskName: string): {baseName: string, flags: {}} {
    const splitFlags = taskName.trim().split(/^(.+?) /);
    let baseName;
    let flags = {};
    if (splitFlags.length === 1) {
        baseName = splitFlags[0];
    } else {
        baseName = splitFlags[1];
        if (splitFlags.length === 3) {
            const yargsParser = require('yargs-parser');
            flags = withoutCommand(yargsParser(splitFlags[2]));
        }
    }
    return {baseName, flags};
}
