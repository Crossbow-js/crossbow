import {Task, getTopLevelValue} from "./task.resolve";
import parse from "./cli.parse";
import {CrossbowInput} from "./index";
import {
    TaskRunModes, createTask, createAdaptorTask, TaskOriginTypes, TaskTypes, CBFunction,
    IncomingTaskItem
} from "./task.resolve";
import {isPlainObject, stringifyObj} from "./task.utils";
import {InvalidTaskInputError} from "./task.errors";
import {TaskErrorTypes} from "./task.errors";
import {Flags} from "./cli.parse";
import {CommandTrigger} from "./command.run";
import {type} from "os";

const _ = require("../lodash.custom");
const qs = require("qs");
const flagRegex = /(.+?)@(.+)?$/;

let inlineFnCount = 0;

export function preprocessTask(taskName: IncomingTaskItem, trigger: CommandTrigger, parents: string[]): Task {

    let output = (function () {
        if (typeof taskName === "function") {
            return handleFunctionInput(<any>taskName, trigger.input, parents);
        }
        if (typeof taskName === "string") {
            return handleStringInput(taskName, trigger, parents);
        }
        if (isPlainObject(taskName)) {
            return handleObjectInput(taskName, trigger.input, parents);
        }
        if (Array.isArray(taskName)) {
            return handleArrayInput(<any>taskName, trigger.input, parents);
        }
    })();

    /**
     * Mark this item as 'skipped' if the task name matches
     * one given in the --skip flag via CLI
     *
     * Note: this is separate to individual task config
     *
     *  eg:
     *      crossbow run deploy --skip build-js
     *
     *  -> All tasks under deploy still run, but build-js will be skipped
     */
    if (trigger.config.skip.length) {
        if (trigger.config.skip.indexOf(output.baseTaskName) > -1) {
            output.skipped = true;
        }
    }

    return output;
}

export interface TaskLiteral {
    tasks?: IncomingTaskItem[];
    runMode?: TaskRunModes;
    input?: string;
    adaptor?: string;
    command?: string;
    description?: string;
}

let objectCount = 0;
export function handleObjectInput(taskLiteral: TaskLiteral, input, parents) {

    /**
     * Any value on the 'tasks' property
     */
    if (taskLiteral.tasks) {

        const name = "AnonObject_" + objectCount++;

        const out = createTask(_.assign({
            baseTaskName: name,
            taskName: name,
            rawInput: JSON.stringify(taskLiteral),
            valid: true,
            parents: parents,
            origin: TaskOriginTypes.InlineObject,
            type: TaskTypes.TaskGroup
        }, taskLiteral));

        return out;
    }

    if (typeof taskLiteral.input === "string") {
        return stubAdaptor(taskLiteral.input, taskLiteral, parents);
    }

    if (typeof taskLiteral.adaptor === "string" && typeof taskLiteral.command === "string") {
        taskLiteral.adaptor = taskLiteral.adaptor.replace(/^@/, "");
        return stubAdaptor(`@${taskLiteral.adaptor} ${taskLiteral.command}`, taskLiteral, parents);
    }

    return createTask({
        rawInput: stringifyObj(taskLiteral),
        taskName: "",
        type: TaskTypes.Adaptor,
        origin: TaskOriginTypes.Adaptor,
        adaptor: "",
        errors: [<InvalidTaskInputError>{
            type: TaskErrorTypes.InvalidTaskInput,
            input: taskLiteral
        }]
    });
}

export function handleArrayInput(taskItems: any[], input: CrossbowInput, parents: string[]) {
    const name = "AnonGroup_" + taskItems.join(",").slice(0, 10) + "...";
    return createTask({
        runMode: TaskRunModes.parallel,
        baseTaskName: name,
        taskName: name,
        rawInput: taskItems.toString(),
        valid: true,
        parents: parents,
        origin: TaskOriginTypes.InlineArray,
        type: TaskTypes.TaskGroup,
        tasks: taskItems
    });
}

function stubAdaptor(inputString, taskLiteral, parents) {
    const taskLiteralAdaptor = createAdaptorTask(inputString, parents);
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
function handleStringInput(taskName: string, trigger: CommandTrigger, parents: string[]) {

    const {input} = trigger;

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
    let split = getSplitFlags(<string>taskName, input);

    /**
     * Split the incoming taskname on colons
     *  eg: sass:site:dev
     *  ->  ['sass', 'site', 'dev']
     * @type {Array}
     */
    const splitTask = split.taskName.split(":");

    /**
     * Take the first (or the only) item as the base task name
     *  eg: uglify:*
     *  ->  'uglify'
     * @type {string}
     */
    const baseTaskName = splitTask[0];
    const subTasks = splitTask.slice(1);
    const isParentName = /^\(.+?\)$/.test(baseTaskName);
    const inputMatchesParentName = (function () {
        if (input.tasks[`(${splitTask[0]})`]) {
            return true;
        }
        if (splitTask[0].match(/^\(.+?\)$/) && input.tasks[splitTask[0]]) {
            return true;
        }
    })();

    const normalisedTaskName = (function () {
        if (isParentName) return baseTaskName.slice(1, -1);
        return baseTaskName;
    })();

    // Before we create the base task, check if this is an alias
    // to another top-level task
    const topLevel = (function () {
        const base = getTopLevelValue(normalisedTaskName, input);
        if (inputMatchesParentName && subTasks.length) {
            return _.get(base, [subTasks], {});
        }
        return base;
    })();

    const topLevelOptions = (function () {
        if (inputMatchesParentName && subTasks.length) {
            return _.get(input.options, [normalisedTaskName, ...subTasks], {});
        }
        return _.get(input.options, [normalisedTaskName], {});
    })();

    /**
     * Create the base task
     */
    const incomingTask = (function () {

        // if it's not an alias
        if (!topLevel && trigger.config.binExecutables.length) {

            // if the normalised task name matches an executable
            if (trigger.config.binExecutables.indexOf(normalisedTaskName) !== -1) {
                return createTask({
                    baseTaskName: taskName,
                    valid: true,
                    adaptor: 'sh',
                    taskName: taskName,
                    rawInput: taskName,
                    parents: parents,
                    command: taskName,
                    runMode: TaskRunModes.series,
                    origin: TaskOriginTypes.Adaptor,
                    type: TaskTypes.Adaptor
                });
            }
        }

        const base = createTask({
            cbflags: split.cbflags,
            query: split.query,
            flags: split.flags,
            baseTaskName: normalisedTaskName,
            subTasks,
            taskName: normalisedTaskName,
            rawInput: <string>taskName,
            options: topLevelOptions
        });

        if (isPlainObject(topLevel) && topLevel.tasks) {
            /**
             * Create the base task
             */
            return _.merge({}, base, topLevel, {
                origin: TaskOriginTypes.InlineChildObject,
                type: inputMatchesParentName ? TaskTypes.ParentGroup : TaskTypes.TaskGroup
            });
        }
        return base;
    })();

    if (inputMatchesParentName) {
        incomingTask.type = TaskTypes.ParentGroup;
    }

    /**
     * Now pass it off to allow any flags to applied
     */
    return processFlags(incomingTask);
}

/**
 * Function can be given inline so this methods handles that
 */
function handleFunctionInput(taskName: Function, input: CrossbowInput, parents: string[]): Task {
    const fnName = taskName["name"];
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
    taskName: string;
    cbflags: string[];
    flags: {};
    query: any;
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
        const splitQuery = baseNameAndFlags.baseName.split("?");
        const query = getQuery(splitQuery);

        /**
         * Next, look at the top-level input,
         * is this taskname going to match, and if so, does it contain any flags?
         */
        const cbflags = Object.keys(input.tasks).reduce(function (all, key) {
            const firstSectionOfTaskName = taskName.split(' ')[0];
            const match = key.match(new RegExp(`^${firstSectionOfTaskName}@(.+)`));
            if (match) {
                return all.concat(match[1].split(""));
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
    const splitQuery = base.split("?");
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
            return [""];
        }
        /**
         * Default case is where there are chars after the @, so we split them up
         *   eg: crossbow run '@npm run webpack@pas'
         *   ->  flags: ['p', 'a', 's']
         */
        return splitCBFlags[2].split("");
    })();

    return {
        taskName: splitQuery[0],
        query,
        cbflags,
        flags: baseNameAndFlags.flags
    };
}

function getQuery(splitQuery: string[]): {} {
    if (splitQuery.length > 1) {
        return qs.parse(splitQuery[1]);
    }
    return {};
}

/**
 * Apply any transformations to options based on
 * CB flags
 * // todo refactor this
 * @param task
 * @returns {any}
 */
function processFlags(task: Task): Task {

    const runMode = (function () {
        if (task.runMode === TaskRunModes.parallel) return TaskRunModes.parallel;
        if (task.cbflags.indexOf("p") > -1) {
            return TaskRunModes.parallel;
        }
        return TaskRunModes.series;
    })();

    return _.assign({}, task, {
        runMode
    });
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
            return parse(splitFlags[1] + " " + splitFlags[2]).flags;
        }
        return <Flags>{};
    })();

    return {baseName, flags};
}
