import {longestString, padLine, escapeNewLines} from "../task.utils";
import {Task, TaskOriginTypes} from "../task.resolve";
import {TaskTypes} from "../task.resolve";
import {WatchRunners} from "../watch.runner";

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

export function getSimpleTaskList(tasks) {
    return twoCol(tasks).map(x => `${x[0]}  ${x[1]}`)
}

export function twoCol (tasks: Task[]): Array<string[]> {
    const longest = longestString(tasks.map(x => x.baseTaskName));
    const cols = process.stdout.columns;

    return tasks.map(function (item) {

        const name = padLine(item.baseTaskName, longest + 1);
        const desclength = (cols - 6) - longest;

        const desc = (function () {

            if (item.description) {
                return limit(item.description, desclength);
            }

            /**
             * .js files on disk
             */
            if (item.type === TaskTypes.ExternalTask) {
                return limit(`Run via: ${item.externalTasks[0].parsed.name}`, desclength);
            }

            /**
             * .sh files on disk
             */
            if (item.origin === TaskOriginTypes.FileSystem) {
                return limit(`Run via: ${item.externalTasks[0].parsed.name}`, desclength);
            }

            return limit(taskPreviews(item), desclength);
        })();

        return [`{bold:${name}}`, desc];
    });
}
export function twoColWatchers (runners: WatchRunners): Array<string[]> {
    const longest = longestString(runners.valid.map(x => x.parent));
    const cols = process.stdout.columns;

    return runners.valid.map(function (runner) {

        const name = padLine(runner.parent, longest + 1);
        const desclength = (cols - 6) - longest;

        const desc = limit(`${runner.patterns.length} pattern(s), ${runner.tasks.length} task(s)`, desclength);

        return [`{bold:${name}}`, desc];
    });
}
