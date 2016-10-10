import {SequenceItemTypes, SequenceItem} from "../task.sequence.factories";
import {CrossbowConfiguration} from "../config";
import {TaskOriginTypes, TaskTypes, TaskCollection, IncomingTaskItem, Task} from "../task.resolve";
import {Watcher} from "../watch.resolve";
import {WatchTask} from "../watch.resolve";
import * as taskErrors from "../task.errors";
import * as watchErrors from "../watch.errors";
import {parse, dirname, join, relative} from "path";
import {resolveBeforeTasks} from "../watch.resolve";
import {resolveTasks} from "../task.resolve";
import {TaskStats} from "../task.runner";
import {countSequenceErrors, collectSkippedTasks, collectRunnableTasks} from "../task.sequence";
import {InputErrorTypes, _e, isInternal, getFunctionName, __e} from "../task.utils";
import {duration, _taskReport} from "./task.list";
import * as reports from "../reporter.resolve";
import not = Rx.helpers.not;

const baseUrl = 'http://crossbow-cli.io/docs/errors';
const archy = require('archy');
const parsed = parse(__dirname);
const depsDir = join(dirname(parsed.dir), 'node_modules');

export const enum LogLevel {
    Short = 0,
    Verbose
}

export default function (report: reports.IncomingReport, observer: Rx.Observer<reports.OutgoingReport>) {
    if (typeof reporterFunctions[report.type] === 'function') {
        const outputFn = reporterFunctions[report.type];
        const output = outputFn.call(null, report);
        if (typeof output === 'string') {
            if (output === '') return;
            observer.onNext({origin: report.type, data: [output]});
        } else if (Array.isArray(output) && output.length) {
            observer.onNext({origin: report.type, data: output});
        } else {
            console.log('STRING or ARRAY not returned for', report.type);
        }
    }
}

const reporterFunctions = {
    [reports.ReportTypes.UsingInputFile]: function (report: reports.UsingConfigFileReport): string {
        return report.data.sources.map(function (input) {
            return `Using: {cyan.bold:${input.relative}}`;
        }).join('\n');
    },
    [reports.ReportTypes.InputError]: function (report: reports.InputErrorReport): string[] {
        const lines = [`Sorry, there were errors resolving your input files`];
        const {sources, errors} = report.data;

        /**
         * If the report has 'sources' it means it was an external file
         */
        if (sources.length) {
            sources.forEach(function (item) {
                lines.push(`{red.bold:x ${item.rawInput}}`);
                lines.push.apply(lines, getExternalError(item.errors[0].type, item.errors[0], item).split('\n'));
            });
        } else {
            /**
             * Otherwise it was some other input error
             */
            errors.forEach(function (error) {
                lines.push.apply(lines, getExternalError(error.type, error).split('\n'));
            });
        }

        return lines;
    },
    [reports.ReportTypes.InvalidReporter]: function (report: reports.InvalidReporterReport): string[] {
        const lines = [`{red.bold:x} Sorry, there were problems resolving your reporters`];
        const {reporters} = report.data;

        reporters.invalid.forEach(function (reporter: reports.Reporter) {
            reporter.errors.forEach(function (err: reports.ReporterError) {

                if (err.type === reports.ReporterErrorTypes.ReporterFileNotFound) {
                    lines.push(`{red.bold:x ${err.file.resolved}`);
                }

                lines.push.apply(lines, getExternalError(err.type, err).split('\n'));
            })
        });

        return lines;
    },
    [reports.ReportTypes.DuplicateInputFile]: function (report: reports.DuplicateConfigFile): string[] {
        const error = report.data.error;
        const lines = [
            `Sorry, this would cause an existing file to be overwritten`,
            `{red.bold:x ${error.file.rawInput}}`
        ];
        return lines.concat(getExternalError(error.type, error, error.file).split('\n'));
    },
    [reports.ReportTypes.InputFileCreated]: function (report: reports.ConfigFileCreatedReport): string[] {
        return `{green:✔} Created file: {cyan.bold:${report.data.parsed.base}}
 
Now, try the \`{yellow:hello-world}\` example in that file by running: 
 
  {gray:$} crossbow run {bold:hello-world} 
 
Or to see multiple tasks running, with some in parallel, try: 

  {gray:$} crossbow run {bold:all}`.split('\n');
    },
    [reports.ReportTypes.InitInputFileTypeNotSupported]: function (report: reports.InitInputFileTypeNotSupportedReport): string[] {
        const error = report.data.error;
        return [
            `Sorry, the type {cyan.bold:${error.providedType}} is not currently supported`,
            `{red.bold:x '${error.providedType}'}`,
            ...getExternalError(error.type, error).split('\n')
        ];
    },
    [reports.ReportTypes.SimpleTaskList]: function (report: reports.SimpleTaskListReport): string[] {
        return [
            '{yellow:Available Tasks:',
            ...report.data.lines
        ];
    },
    [reports.ReportTypes.TaskTree]: function (report: reports.TaskTreeReport): string[] {
        return reportTaskTree(report.data.tasks, report.data.config, report.data.title);
    },
    [reports.ReportTypes.TaskList]: function (report: reports.TaskListReport): string {

        const {config, sequence, titlePrefix, cli} = report.data;

        if (config.verbose === LogLevel.Verbose) {
            const cliInput = cli.input.slice(1).map(x => `'${x}'`).join(' ');
            return reportSequenceTree(sequence, config, `+ Task Tree for ${cliInput}`);
        } else {
            return `{yellow:+}${titlePrefix} {bold:${cli.input.slice(1).join(', ')}`;
        }
    },
    [reports.ReportTypes.TaskErrors]: function (report: reports.TaskErrorsReport): string[] {

        const {taskCollection, tasks, config} = report.data;

        const lines = [
            '{gray.bold:------------------------------------------------}',
            '{err: } Sorry, there were errors resolving your tasks,',
            '  So none of them were run.',
            '{gray.bold:------------------------------------------------}',
        ];

        taskCollection.forEach(function (n, i) {
            lines.push.apply(lines, reportTaskTree([tasks[i]], config, `+ input: '${n}'`));
        });

        return lines;
    },
    [reports.ReportTypes.TaskReport]: function (report: reports.TaskReportReport): string {
        if (report.data.trigger.config.progress) {
            return _taskReport(report.data.report);
        }
        return '';
    },
    [reports.ReportTypes.DocsInvalidTasksSimple]: function (): string[] {
        return [
            '{red.bold:x Invalid tasks',
            'Sorry, we cannot generate documentation for you right now',
            'as you have invalid tasks. Please run {bold:$ crossbow tasks} to see',
            'details about these errors',
        ];
    },
    [reports.ReportTypes.NoTasksAvailable]: function (): string[] {
        return [
            'Sorry, there were no tasks available.',
            `{red.bold:x Input: ''}`,
            ...getExternalErrorLines(InputErrorTypes.NoTasksAvailable, {})
        ];
    },
    [reports.ReportTypes.NoTasksProvided]: function (): string {
        return `Entering interactive mode as you didn't provide a task to run`;
    },
    [reports.ReportTypes.BeforeWatchTaskErrors]: function (report: reports.BeforeWatchTaskErrorsReport): string[] {

        const lines = [
            '{err: } Sorry, there were errors resolving your {red:`before`} tasks',
            '  So none of them were run, and no watchers have begun either.',
        ];

        const {watchTasks, trigger} = report.data;

        watchTasks.all.forEach(function (watchTask) {

            const cliInput = resolveBeforeTasks(trigger.config.before, trigger.input, [watchTask]);
            const tasks = resolveTasks(cliInput, trigger);

            if (!tasks.all.length) {
                return;
            }

            if (trigger.config.verbose === LogLevel.Verbose) {
                lines.push.apply(lines, reportTaskTree(tasks.all, trigger.config, `+ Tasks to run before: '${watchTask.name}'`));
            }

            if (tasks.invalid.length) {
                lines.push.apply(lines, reportTaskTree(tasks.all, trigger.config, `+ Tasks to run before: '${watchTask.name}'`));
            }
        });

        return lines;
    },
    [reports.ReportTypes.BeforeTaskList]: function (report: reports.BeforeTaskListReport): string[] {

        const {config, cli, sequence} = report.data;
        const lines = [
            `{yellow:+} Before tasks for watcher: {bold:${cli.input.join(', ')}}`,
        ];

        if (config.verbose === LogLevel.Verbose) {
            const cliInput = cli.input.map(x => `'${x}'`).join(' ');
            lines.push(reportSequenceTree(sequence, config, `+ Task Tree for ${cliInput}`));
        }

        return lines;
    },
    [reports.ReportTypes.BeforeTasksDidNotComplete]: function (report: reports.BeforeTasksDidNotCompleteReport): string[] {
        return [
            `{red:x} ${report.data.error.message}`,
            '  so none of the watchers started',
        ];
    },
    [reports.ReportTypes.WatchTaskTasksErrors]: function (report: reports.WatchTaskTasksErrorsReport): string[] {

        const {runner, config, tasks} = report.data;

        if (runner._tasks.invalid.length) {
            return [
                '{gray.bold:---------------------------------------------------}',
                `{err: } Sorry, there were errors when resolving the tasks`,
                `  that will be used in the following watcher`,
                ...logWatcher(runner),
                ...reportTaskTree(tasks, config, `+ input: ${runner.parent}`)
            ];
        }

        const lines = [
            '{gray.bold:---------------------------------------------------}',
            `{ok: } No errors from`,
            ...logWatcher(runner),
        ];

        if (config.verbose === LogLevel.Verbose) {
            lines.push.apply(lines, reportTaskTree(tasks, config, `+ input: ${runner.parent}`));
        }

        return lines;
    },
    [reports.ReportTypes.WatchTaskErrors]: function (report: reports.WatchTaskErrorsReport): string[] {

        const {watchTasks} = report.data;

        const errorCount = watchTasks.reduce(function (acc, item) {
            return acc + item.errors.length;
        }, 0);

        const lines = [`Sorry, there were errors resolving your watch tasks`];

        watchTasks.forEach(function (task: WatchTask) {
            if (task.errors.length) {
                lines.push(`{red.bold:x '${task.name}'}`);
                lines.push.apply(lines, getWatchError(task.errors[0], task).split('\n'));
            } else {
                lines.push(`{ok: } '${task.name}'}`);
            }
        });

        lines.push(errorSummary(errorCount));

        return lines;
    },
    [reports.ReportTypes.WatchTaskReport]: function (report: reports.WatchTaskReportReport): string {
        return _taskReport(report.data.report);
    },
    [reports.ReportTypes.NoWatchersAvailable]: function (): string[] {
        return [
            'Sorry, there were no watchers available to run',
            `{red.bold:x No watchers available}`,
            ...getExternalError(InputErrorTypes.NoWatchersAvailable, {}).split('\n')
        ];
    },
    [reports.ReportTypes.NoWatchTasksProvided]: function (): string {
        return `Entering interactive mode as you didn't provide a watcher to run`;
    },
    [reports.ReportTypes.Watchers]: function (report: reports.WatchersReport): string[] {
        const lines = [];
        lines.push(``);
        report.data.watchTasks.forEach(function (watchTask) {
            watchTask.watchers.forEach(function (watcher) {
                lines.push(`{bold:'${watcher.patterns.map(x => _e(x)).join(', ')}}'`);
                lines.push(` {yellow:->} ${watcher.tasks.join(', ')}`)
            });
            lines.push(``);
        });
        lines.push('Watching for changes...');

        return lines;
    },
    [reports.ReportTypes.WatcherNames]: function (report: reports.WatcherNamesReport): string[] {

        const {runners} = report.data;

        const lines = ['{yellow:Available Watchers:}'];

        runners.valid.forEach(function (runner) {
            lines.push('');
            lines.push(`    {bold:Name}:     ${runner.parent}`);
            lines.push(`    {bold:Patterns}: ${runner.patterns.map(_e).join(', ')}`);
            lines.push(`    {bold:Tasks}:    ${runner.tasks.join(', ')}`);
        });

        lines.push(``);
        lines.push(`Run your watchers in the following way:`);
        lines.push(``);

        runners.valid.forEach(function (runner) {
            lines.push(`    {gray:$} crossbow watch {bold:${runner.parent}}`);
        });

        if (runners.valid.length > 1) {
            lines.push('');
            lines.push('Or run multiple watchers at once, such as:');
            lines.push(``);
            lines.push('    {gray:$} crossbow watch ' + runners.valid.slice(0, 2).map(x => `{bold:${x.parent}}`).join(' '));
            lines.push('');
        }
        return lines;
    },
    [reports.ReportTypes.NoFilesMatched]: function (report: reports.NoFilesMatchedReport): string {
        const {watcher} = report.data;
        return `{red:x warning} {cyan:${watcher.patterns.join(' ')}} did not match any files`
    },

    [reports.ReportTypes.WatcherTriggeredTasks]: function (report: reports.WatcherTriggeredTasksReport): string {
        const {index, taskCollection} = report.data;
        return `{yellow:+} [${index}] ${getTaskCollectionList(taskCollection).join(', ')}`;
    },
    [reports.ReportTypes.WatcherTriggeredTasksCompleted]: function (report: reports.WatcherTriggeredTasksCompletedReport): string {
        const {index, taskCollection, time} = report.data;
        return `{green:✔} [${index}] ${getTaskCollectionList(taskCollection).join(', ')} {yellow:(${duration(time)})}`;
    },
    [reports.ReportTypes.DocsGenerated]: function () {
        /** noop **/
    },
    [reports.ReportTypes.DocsInputFileNotFound]: function (report: reports.DocsInputFileNotFoundReport): string[] {
        const {error} = report.data;
        return [
            `Sorry, there were errors resolving your input files`,
            `{red.bold:x '${error.file.resolved}'}`,
            ...getExternalError(error.type, error).split('\n')
        ];
    },
    [reports.ReportTypes.DocsAddedToFile]: function (report: reports.DocsAddedToFileReport): string {
        const {file} = report.data;
        return `{green:✔} Docs added to: {cyan.bold:${file.relative}}`;
    },
    [reports.ReportTypes.DocsOutputFileExists]: function (report: reports.DocsOutputFileExistsReport): string[] {
        const {error} = report.data;
        return [
            `{red.bold:x '${error.file.resolved}'}`,
            ...getExternalError(error.type, error).split('\n')
        ]
    },
    [reports.ReportTypes.SignalReceived]: function reportSummary(report: reports.SignalReceivedReport): string[] {
        return [``, `{yellow:~~~} Exit Signal Received {cyan:(code: ${report.data.code})} {yellow:~~~}`];
    },
    [reports.ReportTypes.WatcherSummary]: function reportSummary(report: reports.WatcherSummaryReport): string[] {
        const {sequence, cli, config, runtime, watcher, watchEvent} = report.data;

        const runnableTasks = collectRunnableTasks(sequence, []);
        const errorTasks = runnableTasks.filter(x => x.stats.errors.length > 0);
        const skippedTasks = runnableTasks.filter(x => x.stats.skipped);
        const completedTasks = runnableTasks.filter(x => x.stats.completed && !x.stats.skipped);

        const lines = [];

        // todo - show a reduced tree showing only errors
        if (config.verbose === LogLevel.Verbose || errorTasks.length > 0) {
            lines.push(reportSequenceTree(sequence, config, `+ Results from ${watcher.parent}`, true));
        }

        if (errorTasks.length) {
            lines.push(`{red:x} ${errorTasks.length} error(s) from watcher {yellow:${watcher.parent}}`);
        }

        return lines;
    },
    [reports.ReportTypes.Summary]: function reportSummary(report: reports.SummaryReport): string[] {

        const {sequence, cli, config, runtime} = report.data;

        const runnableTasks = collectRunnableTasks(sequence, []);
        const errorTasks = runnableTasks.filter(x => x.stats.errors.length > 0);
        const skippedTasks = runnableTasks.filter(x => x.stats.skipped);
        const completedTasks = runnableTasks.filter(x => x.stats.completed && !x.stats.skipped);

        const lines = [];

        // todo - show a reduced tree showing only errors
        if (config.verbose === LogLevel.Verbose || errorTasks.length > 0) {
            const cliInput = cli.input.slice(1).map(x => `'${x}'`).join(' ');
            lines.push(reportSequenceTree(sequence, config, `+ Results from ${cliInput}`, true));
        }

        lines.push(``);

        if (errorTasks.length > 0) {
            lines.push(`{red:x} {bold:Summary:}`);
        } else {
            lines.push(`{ok: } {bold:Summary:}`);
        }

        lines.push(``);
        lines.push(`    Total Time: {yellow:${duration(runtime)}}`);
        lines.push(`    Tasks:      {cyan:${runnableTasks.length}}`);

        if (skippedTasks.length) {
            lines.push(`    Skipped:    {cyan:${skippedTasks.length}}`);
        }

        if (errorTasks.length > 0) {
            lines.push(`    Failed:     {red:${errorTasks.length}}`);
        }

        lines.push(`    Completed:  {green:${completedTasks.length}}`);
        lines.push('');

        return lines;
    },
    [reports.ReportTypes.HashDirError]: function (report: reports.HashDirErrorReport): string[] {
        const {error, cwd} = report.data;
        return [
            `{red.bold:x CB-History hash failed} (tasks will still run)`,
            ...getExternalError(error.type, error, cwd).split('\n')
        ]
    }
};

/**
 * There are multiple ways to output trees to the screen,
 * so this helper function helps to normalize the output
 * by providing the same padding on all but the first line.
 */
export function multiLineTree(tree: string): string {
    const lines = [];
    const split = tree.split('\n');

    lines.push(split[0]);

    split.slice(1, -1).forEach(function (line) {
        lines.push(`   ${line}`);
    });

    return lines.join('\n');
}

function getTaskCollectionList(taskCollection: TaskCollection): string[] {
    return taskCollection.map(incomingTaskItemAsString);
}

function incomingTaskItemAsString(x: IncomingTaskItem): string {
    if (typeof x === 'string') {
        return _e(x);
    }
    if (typeof x === 'function') {
        const fn: any = x;
        if (fn.name) {
            return `[Function: ${fn.name}]`;
        }
        return '[Function]';
    }
}

function getWatcherNode(watcher: Watcher) {
    const tasksString = (function () {
        return watcher.tasks.map(incomingTaskItemAsString).join(', ');
    })();
    return [
        `{bold:Patterns:} {cyan:${watcher.patterns.map(x => _e(x)).join(', ')}}`,
        `{bold:Tasks:} {cyan:${tasksString}}`,
    ].join('\n');
}

function logWatcher(runner) {
    return [
        `  {bold:Watcher name:} {cyan:${runner.parent}}`,
        `      {bold:Patterns:} {cyan:${runner.patterns.join(', ')}}`,
        `         {bold:Tasks:} {cyan:${runner.tasks.join(', ')}}`,
    ]
}

function errorSummary(errorCount: number): string {
    if (errorCount) {
        const plural = errorCount === 1 ? 'error' : 'errors';
        return `{red:x} ${errorCount} ${plural} found (see above)`;
    } else {
        return `{ok: } 0 errors found`;
    }
}

export interface CrossbowError extends Error {
    _cbError?: boolean
    _cbExitCode?: number
}

function getErrorText(sequenceLabel: string, stats: TaskStats, err: CrossbowError, config: CrossbowConfiguration): string {

    if (!err.stack) {
        return err.toString();
    }

    /**
     * If _cbError is on the error object, it's a crossbow-generated
     * error so we handle it as though we know what we're doing
     */
    if (err._cbError) {
        return [
            `{red.bold:x} {red:${sequenceLabel}} {yellow:(${duration(stats.duration)})}`,
            __e(err.stack)
        ].join('\n');
    }

    /**
     * At this point we have no idea what type the error is, so
     * the following code just makes the first line red and then
     * processes the stack traces (to remove internals)
     */
    const head = [
        `{red.bold:x} ${sequenceLabel} {yellow:(${duration(stats.duration)})}`,
        `{red.bold:${err.stack.split('\n').slice(0, 1)}}`
    ];

    const body = err.stack.split('\n').slice(1);
    const stack = getStack(body, config);
    const tail = `- Please see above for any output that may of occurred`;
    if (!stack) {
        return [...head, tail].join('\n');
    }
    return [...head, ...stack, tail].join('\n');
}

export function getStack(stack: string[], config: CrossbowConfiguration): string[] {

    /**
     * An array of string that can be compared
     * against each line of the stack trace to determine
     * if that line should be stipped. EG: we
     * don't want to muddy up stack traces with internals
     * from Rx/Immutable etc.
     */
    const stringMatches = (function () {
        if (config.debug) return [];
        return [
            parsed.dir,
            depsDir,
            'at bound (domain.js',
            'at runBound (domain.js'
        ];
    })();

    return stack
        .filter(line => {
            return stringMatches.every(string => {
                return line.indexOf(string) === -1;
            });
        });
}

/**
 * Add meta info to a sequence item suing the stats.
 * eg:
 *   @npm webpack -w
 * ->
 *   ✔ @npm webpack -w (14.2s)
 */
function appendStatsToSequenceLabel(label: string, stats: TaskStats, config: CrossbowConfiguration) {
    /**
     * If any errors occured, append the error to the
     * label so it shows in the correct part of the tree
     */
    if (stats.errors.length) {
        const err = stats.errors[0];
        return getErrorText(label, stats, err, config);
    }

    /**
     * If this item was skipped, there cannot be anything to append
     */
    if (stats.skipped) {
        return `{yellow:-} ${label} {yellow:(skipped)}`;
    }

    /**
     * the item did not start if `started` is falsey
     */
    if (!stats.started) {
        return `{yellow:x} ${label} {yellow:(didn't start)}`;
    }

    /**
     * 'completed' means this task emitted a completion report.
     */
    if (stats.completed) {
        return `{green:✔} ` + label + ` {yellow:(${duration(stats.duration)})}`;
    }

    /**
     * At this point, the task DID start, but the completed
     * flag is absent so we assume it was halted mid-flight.
     */
    return `{yellow:x} ` + label + ` {yellow:(didn't complete, ${duration(stats.duration)})}`;
}

/**
 * Show a tree of function calls
 */
export function reportSequenceTree(sequence: SequenceItem[], config: CrossbowConfiguration, title, showStats = false): string {

    const toLog = getItems(sequence, []);
    const o = archy({label: `{yellow:${title}}`, nodes: toLog});

    return multiLineTree(o);

    function getItems(items, initial) {
        return items.reduce((acc, item: SequenceItem) => {
            let label = getSequenceLabel(item, config);
            const stats = item.stats;
            if (showStats && item.type === SequenceItemTypes.Task) {
                label = appendStatsToSequenceLabel(label, item.stats, config);
            }

            let nodes = getItems(item.items, []);
            return acc.concat({
                label: label,
                nodes: nodes
            });
        }, initial);
    }
}

function getSequenceLabel(item: SequenceItem, config: CrossbowConfiguration) {

    /**
     * Get the sequence label for a runnable task
     */
    if (item.type === SequenceItemTypes.Task) {
        let baseName = (function () {
            // if (item.viaName) {
            //     return `${item.task.taskName} via {bold:${item.viaName}}`;
            // }
            if (item.subTaskName) {
                if (item.fnName) {
                    return `${item.task.taskName} [Function: {bold:${item.fnName}}] with config {bold:${item.subTaskName}}`;
                } else {
                    return `${item.task.taskName} with config {bold:${item.subTaskName}}`;
                }
            }
            if (item.task.type === TaskTypes.InlineFunction) {
                return `${item.task.rawInput} ${getFunctionName(item.task.inlineFunctions[0])}`;
            }
            if (item.task.type === TaskTypes.ExternalTask) {
                return `${item.task.rawInput}`;
            }
            if (item.task.type === TaskTypes.Adaptor) {
                return `${item.task.rawInput}`;
            }
            if (item.task.externalTasks.length) {
                return moduleLabel(item.task);
            }
            return item.task.taskName;
        })();

        return baseName;
    }

    let baseName = (function () {

        /**
         * Here we are dealing with a ParallelGroup or a SeriesGroup
         */
        if (item.items.length === 1) {
            /**
             * Don't append 'series' or 'parallel' if this group
             * only consists of 1 item
             */
            if (item.subTaskName) {
                return `{bold:${item.taskName}:${item.subTaskName}}`;
            }

            return `{bold:${item.taskName}}`;
        }

        const typeLabel = (() => {
            if (item.type === SequenceItemTypes.ParallelGroup) {
                return '<parallel>';
            }
            return '<series>';
        })();

        return `{bold:${item.taskName}} ${typeLabel}`;
    })();

    if (item.skipped) {
        baseName += ' {yellow:(skipped)}'
    }

    if (item.stats && item.stats.skipped) {
        baseName += ' {yellow:(skipped)}'
    }

    return baseName;
}

export function reportTaskTree(tasks: Task[], config: CrossbowConfiguration, title: string): string[] {

    let errorCount = 0;
    const toLog = getTasks(tasks, [], 0);
    const archy = require('archy');
    const output = archy({label: `{yellow:${title}}`, nodes: toLog});

    return [
        ...multiLineTree(output).split('\n'),
        errorSummary(errorCount)
    ];

    function getTasks(tasks, initial, depth) {

        return tasks.reduce((acc, task) => {

            const errors = getErrors(task);

            if (errors.length) {
                errorCount += errors.length;
            }

            /**
             * Never show internal tasks at top-level
             */
            if (depth === 0) {
                if (isInternal(task.rawInput)) {
                    return acc;
                }
            }

            let nodes = getTasks(task.tasks, [], depth++);
            let label = [getLabel(task), ...errors].join('\n');

            if (config.verbose === LogLevel.Verbose) {
                return acc.concat({
                    label: label,
                    nodes: nodes
                });
            }

            if (task.type === TaskTypes.Adaptor ||
                task.type === TaskTypes.ExternalTask) {
                if (task.errors.length) {
                    return acc.concat({
                        label: label,
                        nodes: []
                    });
                }
                return acc;
            }

            return acc.concat({
                label: label,
                nodes: nodes
            });

        }, initial);
    }
}

export function getErrors(task) {
    if (!task.errors.length) {
        return [];
    }
    if (task.errors[0].type === taskErrors.TaskErrorTypes.TaskNotFound) {
        return [getSingleError(task.errors[0], task)];
    }
    return task.errors.map(error => getSingleError(error, task));
}

function getSingleError(error, task) {
    return getExternalError(taskErrors.TaskErrorTypes[error.type], error, task);
}

function getWatchError(error, task) {
    return getExternalError(watchErrors.WatchTaskErrorTypes[error.type], error, task);
}

function getExternalError<A, B>(type, error: A, val2?: B) {
    return [
        `{red:-} {bold:Error Type:}  ${type}`,
        ...require('./error.' + type).apply(null, [error, val2]),
        `{red:-} {bold:Documentation}: {underline:${baseUrl}/{bold.underline:${type}}}`,
    ].join('\n');
}

function getExternalErrorLines(type, error, val2?): string[] {
    return [
        `{red:-} {bold:Error Type:}  ${type}`,
        ...require('./error.' + type).apply(null, [error, val2]),
        `{red:-} {bold:Documentation}: {underline:${baseUrl}/{bold.underline:${type}}}`,
    ];
}

function moduleLabel(task: Task) {
    const filepath = relative(process.cwd(), task.externalTasks[0].rawInput);
    if (task.taskName === filepath) {
        return `${task.taskName}`;
    }
    return `${task.taskName} ${filepath}`;
}

function npmScriptLabel(task: Task) {
    return `{magenta:[npm script]} ${task.command}`;
}

export function getLabel(task) {

    if (task.type === TaskTypes.InlineFunction) {
        const fnName = (function () {
            if (task.inlineFunctions[0].name !== '') {
                return `[Function: ${task.inlineFunctions[0].name}]`;
            }
            return '[Function]';
        })();
        return maybeErrorLabel(task, `${task.taskName} ${fnName}`);
    }

    if (task.origin === TaskOriginTypes.NpmScripts) {
        return npmScriptLabel(task);
    }

    if (task.type === TaskTypes.TaskGroup) {
        if (task.errors.length) {
            return `{red.bold:x ${task.taskName}}`;
        }
        return `{bold:${task.taskName}}`;
    }

    if (task.type === TaskTypes.ExternalTask) {
        return maybeErrorLabel(task, task.taskName);
    }

    if (task.type === TaskTypes.Adaptor) {
        return maybeErrorLabel(task, task.rawInput);
    }

    if (task.errors.length) {
        return `{red.bold:x ${task.taskName}}`;
    }

    return `${task.taskName}}`;
}

function maybeErrorLabel(task: Task, label: string): string {
    if (task.errors.length) {
        return `{red.bold:x ${label}}`;
    }
    return label;
}
