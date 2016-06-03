import logger from "../logger";
const  l = logger.info;
import {compile, prefix} from '../logger';
import {CrossbowConfiguration} from "../config";
import {isInternal, removeNewlines, replaceNewlines} from "../task.utils";
import {LogLevel, getErrors, getLabel} from "./defaultReporter";
import {Task} from "../task.resolve.d";
import {TaskTypes} from "../task.resolve";
import {longestString, padLine} from "../command.run.interactive";

function taskPreviews(item) {
    const names = item.tasks.map((x:Task) => {
        return replaceNewlines(x.baseTaskName);
    });
    return `[ ${names.join(', ')} ]`;
}

export function printSimpleTaskList(tasks, config: CrossbowConfiguration, title) {

    const longest = longestString(tasks.map(x => x.baseTaskName));
    const minWindow = longest + 6;
    const cols = process.stdout.columns;

    tasks.forEach(function (item) {
        const name = padLine(item.baseTaskName, longest + 1);
        const desclength = (cols - 5) - longest;

        if (item.description) {
            const desc = limit(item.description, desclength);
            logger.info(`{bold:${name}}  ${desc}`);
            return;
        }

        const desc = limit(taskPreviews(item), desclength);
        logger.info(`{bold:${name}}  ${desc}`);
    });

    function limit (string, linelength) {
        const rem = string.length - linelength;
        if (rem > 0) {
            return string.slice(0, linelength - 3) + '...';
        }
        return string;
    }
}