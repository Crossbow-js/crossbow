import {longestString, padLine, escapeNewLines, isInternal} from "../task.utils";
import {Task, TaskOriginTypes, TaskRunModes} from "../task.resolve";
import {TaskTypes} from "../task.resolve";
import {WatchRunners} from "../watch.runner";
import {TaskReport, TaskReportType} from "../task.runner";
import {getLabel} from "./defaultReporter";

export interface WriteableStream {
    columns: number
}

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

export function getSimpleTaskList(tasks: Task[]) {
    const filtered = tasks
        .filter(x => !isInternal(x.taskName))
        .filter(x => x.baseTaskName[0] !== '_');

    return twoCol(filtered).map(x => `${x[0]}  ${x[1]}`)
}

export function twoCol (tasks: Task[]): Array<string[]> {

    const longest = longestString(tasks.map(x => {
        if (x.runMode === TaskRunModes.parallel) {
            return x.baseTaskName + ' <p>';
        }
        return x.baseTaskName;
    }));

    const cols = process.stdout.columns;

    return tasks.map(function (item) {

        const outgoingName = (function () {
            if (item.runMode === TaskRunModes.parallel) {
                return item.baseTaskName + ' <p>';
            }
            return item.baseTaskName;
        })();

        const name = padLine(outgoingName, longest + 1);

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

        return [name, desc];
    });
}
export function twoColWatchers (runners: WatchRunners): Array<string[]> {
    const longest = longestString(runners.valid.map(x => x.parent));
    const cols = process.stdout.columns;

    return runners.valid.map(function (runner) {

        const name = padLine(runner.parent, longest + 1);
        const desclength = (cols - 6) - longest;

        const desc = limit(`${runner.patterns.length} pattern(s), ${runner.tasks.length} task(s)`, desclength);

        return [name, desc];
    });
}

export function _taskReport(report: TaskReport): string {

    const skipped     = report.item.task.skipped || report.stats.skipped;
    const item        = report.item;
    const task        = item.task;
    const labelPrefix = getLabel(task);

    const label = escapeNewLines((function () {
        if (item.subTaskName) {
            return `${item.task.taskName}:{bold:${item.subTaskName}}`;
        }
        if (item.viaName) {
            if (item.viaName.indexOf(':') > -1) {
                const split = item.viaName.split(':');
                return `${split[0]}:{bold:${split[1]}}`;
            }
            return item.viaName;
        }
        return labelPrefix;
    })());

    const withFlags = (function (label) {
        if (Object.keys(task.flags).length) {
            return `${label}${task.rawInput.replace(label, '')}`;
        }
        return label;
    })(label);

    return (function (label) {
        if (report.type === TaskReportType.start) {
            if (skipped) {
                return `{yellow:-} ${label} {yellow:(skipped)}`;
            }
            return `{yellow:>} ${label}`;
        }
        if (report.type === TaskReportType.end) {
            if (skipped) {
                return '';
            }
            return `{green:✔} ${label} {yellow:(${duration(report.stats.duration)})}`;
        }
        if (report.type === TaskReportType.error) {
            return `{red:x} ${label}`;
        }
    })(withFlags);
}

export function duration(ms) {
    return String((Number(ms) / 1000).toFixed(2)) + 's';
}
