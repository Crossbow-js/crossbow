import {longestString, padLine, escapeNewLines, isInternal, getChildTaskNames} from "../task.utils";
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
        return escapeNewLines(getLabel(x));
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

export function getSimpleTaskList(tasks: Task[], longest: number) {
    const filtered = tasks
        .filter(x => !isInternal(x.taskName))
        .filter(x => x.baseTaskName[0] !== '_');

    return twoCol(filtered, longest).map(x => `${x[0]}  ${x[1]}`)
}

export function twoCol (tasks: Task[], longest: number): Array<string[]> {

    const cols = process.stdout.columns;

    return tasks.map(function (task: Task) {

        const outgoingName = (function () {
            if (task.type === TaskTypes.ParentGroup) {
                return `${task.baseTaskName}:${task.subTasks[0]}`;
            }
            if (task.runMode === TaskRunModes.parallel) {
                return task.baseTaskName + ' <p>';
            }
            return task.baseTaskName;
        })();

        const name = padLine(outgoingName, longest + 1);

        const desclength = (cols - 6) - longest;

        const desc = (function () {

            if (task.description) {
                return limit(task.description, desclength);
            }

            /**
             * .js files on disk
             */
            if (task.type === TaskTypes.ExternalTask) {
                return limit(`Run via: ${task.externalTasks[0].parsed.name}`, desclength);
            }

            /**
             * .sh files on disk
             */
            if (task.origin === TaskOriginTypes.FileSystem) {
                return limit(`Run via: ${task.externalTasks[0].parsed.name}`, desclength);
            }

            if (task.type === TaskTypes.ParentGroup) {
                return limit(taskPreviews(task.tasks[0]), desclength);
            }

            return limit(taskPreviews(task), desclength);
        })();

        return [`{yellow:${name}}`, desc];
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
