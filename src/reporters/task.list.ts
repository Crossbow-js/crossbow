import logger from "../logger";
import {escapeNewLines} from "../task.utils";
import {Task} from "../task.resolve.d";
import {TaskTypes} from "../task.resolve";
import {longestString, padLine} from "../command.run.interactive";

function taskPreviews(item: Task) {
    if (!item.tasks.length) {
        if (item.type === TaskTypes.InlineFunction) {
            if (item.inlineFunctions[0].name) {
                return `[ Function: ${item.inlineFunctions[0].name} ]`;
            }
            return '[ Function ]';
        }
    }
    const names = item.tasks.map((x:Task) => {
        return escapeNewLines(x.baseTaskName);
    });
    return `[ ${names.join(', ')} ]`;
}

function limit (string, linelength) {
    const rem = string.length - linelength;
    if (rem > 0) {
        return string.slice(0, linelength - 3) + '...';
    }
    return string;
}

export function printSimpleTaskList(tasks) {
    const cols = twoCol(tasks);
    cols.forEach(function (item) {
    	logger.info(`${item[0]}  ${item[1]}`);
    });
}

export function twoCol (tasks: Task[]): Array<string[]> {
    const longest = longestString(tasks.map(x => x.baseTaskName));
    const cols = process.stdout.columns;

    return tasks.map(function (item) {
        
        const name = padLine(item.baseTaskName, longest + 1);
        const desclength = (cols - 5) - longest;

        if (item.description) {
            const desc = limit(item.description, desclength);
            // logger.info(`{bold:${name}}  ${desc}`);
            return [`{bold:${name}}`, desc];
        }

        const desc = limit(taskPreviews(item), desclength);
        return [`{bold:${name}}`, desc];
    });
}
