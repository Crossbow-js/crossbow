import logger from "../logger";
const  l = logger.info;
import {compile, prefix} from '../logger';
import {CrossbowConfiguration} from "../config";
import {isInternal} from "../task.utils";
import {LogLevel, getErrors, getLabel} from "./defaultReporter";
import {Task} from "../task.resolve.d";
import {TaskTypes} from "../task.resolve";
import {longestString, padLine} from "../command.run.interactive";

function getDescription (task) {
    if (task.description) return task.description;
    if (task.tasks.length) return `${task.tasks.length}`;
    return 'No description'
}

export function printSimpleTaskList(tasks, config: CrossbowConfiguration, title) {

    const toLog = tasks.map(function (task) {
    	return {
            label: task.baseTaskName,
            description: getDescription(task)
        }
    });

    const longest   = longestString(toLog.map(x => x.label));
    const minWindow = longest + 6;
    const cols = process.stdout.columns;

    toLog.forEach(function (item) {
        const name  = padLine(item.label, longest+1);
        const desclength = (cols - 10) - longest;
        const desc = multi(item.description, desclength);
        logger.info(`{bold:${name}}  ${desc}`);
    });

    function multi (string, linelength) {
        const rem = string.length - linelength;
        if (rem > 0) {
            return string.slice(0, linelength - 3) + '...';
        }
        return string;
    }

    // const archy    = require('archy');
    // const o = archy({label: `{yellow:${title}}`, nodes: toLog}, prefix);
    // logger.info(o.slice(26, -1));

    // // nl();
    // if (errorCount) {
    //     l(`{red:x} ${errorCount} %s found (see above)`, errorCount === 1 ? 'error' : 'errors');
    // } else {
    //     l(`{ok: } 0 errors found`);
    // }
    //
    // function getTasks(tasks, initial, depth) {
    //
    //     return tasks.reduce((acc, task) => {
    //
    //         const errors = getErrors(task);
    //
    //         if (errors.length) {
    //             errorCount += errors.length;
    //         }
    //
    //         /**
    //          * Never show internal tasks at top-level
    //          */
    //         if (depth === 0) {
    //             if (isInternal(task.rawInput)) {
    //                 return acc;
    //             }
    //         }
    //
    //         let nodes = getTasks(task.tasks, [], depth++);
    //         let label = [getLabel(task), ...errors].join('\n');
    //
    //         /**
    //          * Any errors,
    //          */
    //         if (errorCount) {
    //             return acc.concat({
    //                 label: label,
    //                 nodes: nodes
    //             });
    //         }
    //         const displayNodes = (function () {
    //             if (config.verbose === LogLevel.Verbose && task.tasks.length) {
    //                 return task.tasks.map((x:Task) => `${x.taskName}`);
    //             }
    //             return [];
    //         })();
    //         const displayLabel = (function () {
    //             const withCount = (function () {
    //                 if ((task.tasks.length > 1) && config.verbose === LogLevel.Short) {
    //                     return label + ` [${task.tasks.length}]`;
    //                 }
    //                 return label;
    //             })();
    //             if (task.description) {
    //                 return withCount + ' - ' + task.description;
    //             }
    //             return withCount;
    //         })();
    //         return acc.concat({
    //             label: displayLabel,
    //             nodes: displayNodes
    //         });
    //
    //     }, initial);
    // }
}