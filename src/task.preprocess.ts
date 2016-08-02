import {Task} from "./task.resolve";
import parse from './cli.parse';
import {CrossbowInput} from "./index";
import {
    TaskRunModes, createTask, createAdaptorTask, TaskOriginTypes, TaskTypes, CBFunction,
    IncomingTaskItem
} from "./task.resolve";
import {isPlainObject, stringifyObj} from "./task.utils";
import {InvalidTaskInputError} from "./task.errors";
import {TaskErrorTypes} from "./task.errors";
import {Flags} from "./cli.parse";

const _ = require('../lodash.custom');
const qs = require('qs');
const flagRegex = /(.+?)@(.+)?$/;

let inlineFnCount = 0;

export function preprocessTask(taskName: IncomingTaskItem, input: CrossbowInput, parents: string[]): Task {

    if (typeof taskName === 'function') {
        return handleFunctionInput(taskName, input, parents);
    }
    if (typeof taskName === 'string') {
        return handleStringInput(taskName, input, parents);
    }
    if (isPlainObject(taskName)) {
        return handleObjectInput(taskName, input, parents);
    }
}

export interface TaskLiteral {
    input?: string
    adaptor?: string
    command?: string
    tasks?: IncomingTaskItem[]
    description?: string
}

function handleObjectInput(taskLiteral: TaskLiteral, input, parents) {

    if (typeof taskLiteral.input === 'string') {
        return stubAdaptor(taskLiteral.input, taskLiteral, parents);
    }

    if (typeof taskLiteral.adaptor === 'string' && typeof taskLiteral.command === 'string') {
        taskLiteral.adaptor = taskLiteral.adaptor.replace(/^@/, '');
        return stubAdaptor(`@${taskLiteral.adaptor} ${taskLiteral.command}`, taskLiteral, parents);
    }

    return createTask({
        rawInput: stringifyObj(taskLiteral),
        taskName: '',
        type: TaskTypes.Adaptor,
        origin: TaskOriginTypes.Adaptor,
        adaptor: '',
        errors: [<InvalidTaskInputError>{
            type: TaskErrorTypes.InvalidTaskInput,
            input: taskLiteral
        }]
    });
}

function stubAdaptor (string, taskLiteral, parents) {
    const taskLiteralAdaptor = createAdaptorTask(string, parents);
    return _.assign({}, taskLiteralAdaptor, taskLiteral);
}

/**
 * String can be given that may be task themselves, like NPM tasks
 * or shell commands, but they can also be an alias for other tasks
 *
 * examples:
 *
 *  - @npm webpack --config webpack.dev.js
 *  - build (which may be an alias for many other tasks)
 */
function handleStringInput (taskName:string, input:CrossbowInput, parents:string[]) {
    /**
     * Never modify the current task if it begins
     * with a `@` - instead just return early with
     * a adaptors task
     *  eg: `@npm webpack`
     */
    if (taskName.match(/^@/)) {
        return createAdaptorTask(taskName, parents);
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
    const incomingTask = createTask({
        cbflags: split.cbflags,
        query: split.query,
        flags: split.flags,
        baseTaskName,
        subTasks,
        taskName: baseTaskName,
        rawInput: <string>taskName
    });

    /**
     * Now pass it off to allow any flags to applied
     */
    return processFlags(incomingTask);
}

function handleObjectWithTasksInput(taskLiteral: TaskLiteral, parents: string[]) {
    // console.log(parents.slice(-1)[0]);
    // createTask({
    //     baseTaskName: identifier,
    //     taskName: identifier,
    //     rawInput: identifier,
    //     inlineFunctions: [<CBFunction>taskName],
    //     valid: true,
    //     parents: parents,
    //     origin: TaskOriginTypes.InlineFunction,
    //     type: TaskTypes.InlineFunction
    // });
}

/**
 * Function can be given inline so this methods handles that
 */
function handleFunctionInput (taskName: CBFunction, input: CrossbowInput, parents: string[]): Task {
    const fnName = taskName.name;
    const identifier = `_inline_fn_${inlineFnCount++}_` + fnName;
    return createTask({
        runMode: TaskRunModes.series,
        baseTaskName: identifier,
        taskName: identifier,
        rawInput: identifier,
        inlineFunctions: [<CBFunction>taskName],
        valid: true,
        parents: parents,
        origin: TaskOriginTypes.InlineFunction,
        type: TaskTypes.InlineFunction
    });
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
        const query = getQuery(splitQuery);

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
    const query = getQuery(splitQuery);

    const cbflags = (function () {
        /**
         * If the 3rd item in the regex match is undefined, it means
         * the @ was used at the end of the task name, but a value was not given.
         * In that case we return an empty string to allow the error collection
         * to kick in later
         * @type {string[]}
         */
        if (splitCBFlags[2] === undefined) {
            return [''];
        }
        /**
         * Default case is where there are chars after the @, so we split them up
         *   eg: crossbow run '@npm run webpack@pas'
         *   ->  flags: ['p', 'a', 's']
         */
        return splitCBFlags[2].split('')
    })();

    return {
        taskName: splitQuery[0],
        query,
        cbflags,
        flags: baseNameAndFlags.flags
    };
}

function getQuery (splitQuery: string[]): {} {
    if (splitQuery.length > 1) {
        return qs.parse(splitQuery[1]);
    }
    return {}
}

/**
 * Apply any transformations to options based on
 * CB flags
 * @param task
 * @returns {any}
 */
function processFlags(task: Task): Task {

    const runMode = (function () {
        if (task.cbflags.indexOf('p') > -1) {
            return TaskRunModes.parallel;
        }
        return TaskRunModes.series;
    })();

    return _.assign({}, task, {
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
function getBaseNameAndFlags(taskName: string): {baseName: string, flags: Flags} {
    const splitFlags = taskName.trim().split(/^(.+?) /);

    /**
     * Basename is everything upto the first space
     * @type {string}
     */
    const baseName = (function () {
        if (splitFlags.length === 1) {
            return splitFlags[0];
        }
        return splitFlags[1];
    })();

    /**
     * Flags is an object containing anything after the first space,
     * parsed as CLI input
     * @type {Flags|{}}
     */
    const flags = (function () {
        if (splitFlags.length === 3) {
            return parse(splitFlags[1] +  ' ' + splitFlags[2]).flags;
        }
        return <Flags>{};
    })();

    return {baseName, flags};
}
