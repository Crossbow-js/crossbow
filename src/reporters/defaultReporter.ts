import {SequenceItemTypes, SequenceItem} from "../task.sequence.factories";
import {CrossbowConfiguration} from "../config";
import {CLI, CrossbowInput} from "../index";
import {TaskOriginTypes, TaskTypes, TaskCollection, IncomingTaskItem, Task} from "../task.resolve";
import {Watcher} from "../watch.resolve";
import {WatchTask} from "../watch.resolve";

import * as taskErrors from "../task.errors";
import * as watchErrors from "../watch.errors";

import logger, {compile} from "../logger";
import {ParsedPath, parse, dirname, join, relative} from "path";
import {WatchTasks} from "../watch.resolve";
import {resolveBeforeTasks} from "../watch.resolve";
import {resolveTasks} from "../task.resolve";
import {CommandTrigger} from "../command.run";
import {TaskReport, TaskReportType, TaskStats} from "../task.runner";
import {countSequenceErrors, collectSkippedTasks} from "../task.sequence";
import {InputErrorTypes, _e, isInternal, getFunctionName, __e, escapeNewLines} from "../task.utils";
import {ExternalFileInput, ExternalFileContent} from "../file.utils";
import {WatchRunners} from "../watch.runner";
import {InitConfigFileExistsError, InitConfigFileTypeNotSupported} from "../command.init";
import {twoColWatchers} from "./task.list";
import {ReportNames, Reporters, Reporter, ReporterErrorTypes, ReporterError} from "../reporter.resolve";
import {DocsInputFileNotFoundError, DocsOutputFileExistsError} from "../command.docs";

const l = logger.info;
const baseUrl = 'http://crossbow-cli.io/docs/errors';
const archy = require('archy');
const parsed = parse(__dirname);
const depsDir = join(dirname(parsed.dir), 'node_modules');

export const enum LogLevel {
    Short = 0,
    Verbose
}

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

/**
 * Accept any string and output each line as though
 * logger.info was called for each line (to maintain prefixes etc)
 */
export function multiLine(input: string) {
    input.split('\n')
        .forEach(function (line) {
            logger.info(line);
        });
}

/**
 * Summary is a sequence tree with stats overlaid
 */
export interface SummaryReport extends IncomingReport {
    data: {
        sequence: SequenceItem[],
        cli: CLI,
        title: string,
        config: CrossbowConfiguration,
        runtime: number
    }
}

function reportSummary(report: SummaryReport) : string[] {

    const {sequence, cli, title, config, runtime} = report.data;

    const errorCount = countSequenceErrors(sequence);
    const skipCount  = collectSkippedTasks(sequence, []);
    const lines      = [];

    // todo - show a reduced tree showing only errors
    if (config.verbose === LogLevel.Verbose || errorCount > 0) {
        const cliInput = cli.input.slice(1).map(x => `'${x}'`).join(' ');
        lines.push(reportSequenceTree(sequence, config, `+ Results from ${cliInput}`, true));
    }

    lines.push('{gray:--------}');

    if (errorCount > 0) {

        cli.input.slice(1).forEach(function (input) {
            const match = getSequenceItemThatMatchesCliInput(sequence, input);
            const errors = countSequenceErrors(match);
            if (errors > 0) {
                lines.push(`{red:x} input: {yellow:${input}} caused an error`);
            }
        });

        if (config.fail) {
            lines.push(`{red:x} ${title} {yellow:${duration(runtime)} (${errorCount} %s)`, errorCount === 1 ? 'error' : 'errors');
        } else {
            lines.push(`{yellow:x} ${title} {yellow:${duration(runtime)} (${errorCount} %s)`, errorCount === 1 ? 'error' : 'errors');
        }
    } else {

        if (skipCount.length > 0) {
            lines.push(`{ok: } ${title} {yellow:${duration(runtime)}} (${skipCount.length} skipped item${skipCount.length === 1 ? '' : 's'}, use -f to force)`);
        } else {
            lines.push(`{ok: } ${title} {yellow:${duration(runtime)}}`);
        }
    }

    lines.push('{gray:--------}');

    return lines;
}

function _taskReport(report: TaskReport) {

    const skipped = report.item.task.skipped || report.stats.skipped;
    const item    = report.item;

    const label   = escapeNewLines((function () {
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
        return item.task.rawInput;
    })());

    return (function () {
        if (report.type === TaskReportType.start) {
            if (skipped) {
                return compile(`{yellow:-} ${label} {yellow:(skipped)}`);
            }
            return compile(`{yellow:>} ${label}`);
        }
        if (report.type === TaskReportType.end) {
            if (skipped) {
                return '';
            }
            return compile(`{green:✔} ${label} {yellow:(${duration(report.stats.duration)})}`);
        }
        if (report.type === TaskReportType.error) {
            return compile(`{red:x} ${label}`);
        }
    })();
}

function getSequenceItemThatMatchesCliInput(sequence: SequenceItem[], input: string): SequenceItem[] {
    return sequence.filter(function (item) {
        if (item.taskName) {
            if (item.taskName === input) {
                return true;
            }
        } else {
            return item.task.rawInput === input;
        }
    });
}

function getTaskCollectionList(taskCollection: TaskCollection): string[] {
    return taskCollection.map(incomingTaskItemAsString);
}

function incomingTaskItemAsString(x: IncomingTaskItem): string {
    if (typeof x === 'string') {
        return _e(x);
    }
    if (typeof x === 'function') {
        if (x.name) {
            return `[Function: ${x.name}]`;
        }
        return '[Function]';
    }
}

export interface TaskListReport extends IncomingReport {
    data: {
        sequence: SequenceItem[],
        cli: CLI,
        titlePrefix: string,
        config: CrossbowConfiguration
    }
}

function reportBeforeTasksDidNotComplete(error: Error) {
    l('{red:x} %s', error.message);
    l('  so none of the watchers started');
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

function reportWatchTaskTasksErrors(tasks: Task[], runner: Watcher, config: CrossbowConfiguration) {

    if (runner._tasks.invalid.length) {
        l('{gray.bold:---------------------------------------------------}');
        l(`{err: } Sorry, there were errors when resolving the tasks`);
        l(`  that will be used in the following watcher`);
        logWatcher(runner);
        reportTaskTree(tasks, config, `+ input: ${runner.parent}`);
    } else {
        l('{gray.bold:---------------------------------------------------}');
        l(`{ok: } No errors from`);
        logWatcher(runner);
        if (config.verbose === LogLevel.Verbose) {
            reportTaskTree(tasks, config, `+ input: ${runner.parent}`);
        }
    }
}

function logWatcher(runner) {
    l(`  {bold:Watcher name:} {cyan:${runner.parent}}`);
    l(`      {bold:Patterns:} {cyan:${runner.patterns.join(', ')}}`);
    l(`         {bold:Tasks:} {cyan:${runner.tasks.join(', ')}}`);
}

function logWatcherNames(runners: WatchRunners, trigger: CommandTrigger) {
    logger.info('{yellow:Available Watchers:}');

    if (trigger.config.verbose === LogLevel.Short) {
        twoColWatchers(runners).forEach(x => logger.info(`${x[0]} ${x[1]}`));
        return;
    }
    runners.valid.forEach(function (runner) {
        logger.info(`Name:  {bold:${runner.parent}}`);
        logger.info('Files: ' + runner.patterns.map(_e).map(x => `{cyan:${x}}`).join(', '));
        logger.info(`Tasks: ` + runner.tasks.map(x => `{magenta:${x}}`).join(', '));
        logger.info('');
    });

    logger.info(`Run your watchers in the following way:`);
    logger.info(``);

    runners.valid.forEach(function (runner) {
        logger.info(` {gray:$} crossbow watch {bold:${runner.parent}}`);
    });

    if (runners.valid.length > 1) {
        logger.info('');
        logger.info('Or run multiple watchers at once, such as:');
        logger.info(``);
        logger.info(' {gray:$} crossbow watch ' + runners.valid.slice(0, 2).map(x => `{bold:${x.parent}}`).join(' '));
        logger.info('');
    }
}

function logWatchErrors(tasks: WatchTask[]): void {

    const errorCount = tasks.reduce(function (acc, item) {
        return acc + item.errors.length;
    }, 0);

    tasks.forEach(function (task: WatchTask) {
        if (task.errors.length) {
            logger.info(`{red.bold:x '${task.name}'}`);
            multiLine(getWatchError(task.errors[0], task));
        } else {
            logger.info(`{ok: } '${task.name}'}`);
        }
    });

    errorSummary(errorCount);
}

function errorSummary(errorCount: number): string {
    if (errorCount) {
        const plural = errorCount === 1 ? 'error' : 'errors';
        return `{red:x} ${errorCount} ${plural} found (see above)` ;
    } else {
        return `{ok: } 0 errors found`;
    }
}

function heading(title) {
    l(`${title}`);
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
                return compile(`{bold:${item.taskName}:${item.subTaskName}}`);
            }

            return compile(`{bold:${item.taskName}}`);
        }

        const typeLabel = (() => {
            if (item.type === SequenceItemTypes.ParallelGroup) {
                return '<parallel>';
            }
            return '<series>';
        })();

        return compile(`{bold:${item.taskName}} ${typeLabel}`);
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
    
    console.log(multiLineTree(output).split('\n'));

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

function duration(ms) {
    return String((Number(ms) / 1000).toFixed(2)) + 's';
}

export interface UsingConfigFileReport extends IncomingReport {
    data: {
        sources: ExternalFileInput[]
    }
}

export interface InputFileNotFoundReport extends IncomingReport {
    data: {
        sources: ExternalFileInput[]
    }
}

export interface TaskReportReport {
    data: {
        report: TaskReport,
        trigger: CommandTrigger
    }
}

export interface SimpleTaskListReport extends IncomingReport {
    data: {lines: string[]}
}
export interface InvalidReporterReport extends IncomingReport {
    data: {reporters: Reporters}
}
export interface DuplicateConfigFile extends IncomingReport {
    data: {error: InitConfigFileExistsError}
}
export interface ConfigFileCreatedReport extends IncomingReport {
    data: {parsed: ParsedPath}
}
export interface InitInputFileTypeNotSupportedReport extends IncomingReport {
    data: {error: InitConfigFileTypeNotSupported}
}
export interface TaskTreeReport extends IncomingReport {
    data: {tasks: Task[], config: CrossbowConfiguration, title: string}
}
export interface TaskErrorsReport extends IncomingReport {
    data: {tasks: Task[], taskCollection: TaskCollection, input: CrossbowInput, config: CrossbowConfiguration}
}
export interface WatchersReport extends IncomingReport {
    data: {watchTasks: WatchTask[]}
}
export interface BeforeWatchTaskErrorsReport extends IncomingReport {
    data: {watchTasks: WatchTasks, trigger: CommandTrigger}
}
export interface BeforeTaskListReport extends IncomingReport {
    data: {sequence: SequenceItem[], cli: CLI, config: CrossbowConfiguration}
}

const reporterFunctions = {
    [ReportNames.UsingInputFile]: function (report: UsingConfigFileReport) {
        return report.data.sources.map(function (input) {
            return `Using: {cyan.bold:${input.relative}}`;
        }).join('\n');
    },
    [ReportNames.InputFileNotFound]: function (report: InputFileNotFoundReport): string[] {
        const lines = [`Sorry, there were errors resolving your input files`];

        report.data.sources.forEach(function (item) {
            lines.push(`{red.bold:x ${item.rawInput}}`);
            lines.push.apply(lines, getExternalError(item.errors[0].type, item.errors[0], item).split('\n'));
        });

        return lines;
    },
    [ReportNames.InvalidReporter]: function (report: InvalidReporterReport): string[] {
        const lines = [`{red.bold:x} Sorry, there were problems resolving your reporters`];
        const {reporters} = report.data;

        reporters.invalid.forEach(function (reporter: Reporter) {
            reporter.errors.forEach(function (err: ReporterError) {

                if (err.type === ReporterErrorTypes.ReporterFileNotFound) {
                    lines.push(`{red.bold:x ${err.file.resolved}`);
                }

                lines.push.apply(lines, getExternalError(err.type, err).split('\n'));
            })
        });

        return lines;
    },
    [ReportNames.DuplicateInputFile]: function (report: DuplicateConfigFile): string[] {
        const error = report.data.error;
        const lines = [
            `Sorry, this would cause an existing file to be overwritten`,
            `{red.bold:x ${error.file.rawInput}}`
        ];
        return lines.concat(getExternalError(error.type, error, error.file).split('\n'));
    },
    [ReportNames.InputFileCreated]: function (report: ConfigFileCreatedReport) {
        return `{green:✔} Created file: {cyan.bold:${report.data.parsed.base}}
 
Now, try the \`{yellow:hello-world}\` example in that file by running: 
 
  {gray:$} crossbow run {bold:hello-world} 
 
Or to see multiple tasks running, with some in parallel, try: 

  {gray:$} crossbow run {bold:all}`.split('\n');
    },
    [ReportNames.InitInputFileTypeNotSupported]: function (report: InitInputFileTypeNotSupportedReport): string[] {
        const error = report.data.error;
        return [
            `Sorry, the type {cyan.bold:${error.providedType}} is not currently supported`,
            `{red.bold:x '${error.providedType}'}`,
            ...getExternalError(error.type, error).split('\n')
        ];
    },
    [ReportNames.SimpleTaskList]: function (report: SimpleTaskListReport): string[] {
        return [
            '{yellow:Available Tasks:',
            ...report.data.lines
        ];
    },
    [ReportNames.TaskTree]: function (report: TaskTreeReport): string[] {
        return reportTaskTree(report.data.tasks, report.data.config, report.data.title);
    },
    [ReportNames.TaskList]: function (report: TaskListReport): string {

        const {config, sequence, titlePrefix, cli} = report.data;

        if (config.verbose === LogLevel.Verbose) {
            const cliInput = cli.input.slice(1).map(x => `'${x}'`).join(' ');
            return reportSequenceTree(sequence, config, `+ Task Tree for ${cliInput}`);
        } else {
            return compile(`{yellow:+}${titlePrefix} {bold:${cli.input.slice(1).join(', ')}`);
        }
    },
    [ReportNames.TaskErrors]: function (report: TaskErrorsReport): string[] {

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
    [ReportNames.TaskReport]: function (report: TaskReportReport): string {
        if (report.data.trigger.config.progress) {
            return _taskReport(report.data.report);
        }
        return '';
    },
    [ReportNames.DocsInvalidTasksSimple]: function (): string[] {
        return [
            '{red.bold:x Invalid tasks',
            'Sorry, we cannot generate documentation for you right now',
            'as you have invalid tasks. Please run {bold:$ crossbow tasks} to see',
            'details about these errors',
        ];
    },
    [ReportNames.NoTasksAvailable]: function (): string[] {
        return [
            'Sorry, there were no tasks available.',
            `{red.bold:x Input: ''}`,
            ...getExternalErrorLines(InputErrorTypes.NoTasksAvailable, {})
        ];
    },
    [ReportNames.NoTasksProvided]: function (): string {
        return `Entering interactive mode as you didn't provide a task to run`;
    },
    [ReportNames.BeforeWatchTaskErrors]: function (report: BeforeWatchTaskErrorsReport): string[] {

        const lines = [
            '{err: } Sorry, there were errors resolving your {red:`before`} tasks',
            '  So none of them were run, and no watchers have begun either.',
        ];

        const {watchTasks, trigger} = report.data;
        
        watchTasks.all.forEach(function (watchTask) {
            const cliInput = resolveBeforeTasks(trigger.config.before, trigger.input, [watchTask]);
            const tasks    = resolveTasks(cliInput, trigger);

            if (!tasks.all.length) {
                return;
            }

            if (trigger.config.verbose === LogLevel.Verbose) {
                lines.push.apply(lines, reportTaskTree(tasks.all, trigger.config, `+ Tasks to run before: '${watchTask.name}'`));
            }

            if (tasks.invalid.length) {
                return lines.push.apply(lines, reportTaskTree(tasks.all, trigger.config, `+ Tasks to run before: '${watchTask.name}'`));
            }
        });
        
        return lines;
    },
    [ReportNames.BeforeTaskList]: function reportBeforeTaskList(report: BeforeTaskListReport): string[] {

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
    [ReportNames.BeforeTasksDidNotComplete]: reportBeforeTasksDidNotComplete,
    [ReportNames.WatchTaskTasksErrors]: reportWatchTaskTasksErrors,
    [ReportNames.WatchTaskErrors]: function (tasks: WatchTask[]) {
        heading(`Sorry, there were errors resolving your watch tasks`);
        logWatchErrors(tasks);
    },
    [ReportNames.WatchTaskReport]: function (report: TaskReport, trigger: CommandTrigger) {
        _taskReport(report);
    },
    [ReportNames.NoWatchersAvailable]: function () {
        heading('Sorry, there were no watchers available to run');
        logger.info(`{red.bold:x No watchers available}`);
        multiLine(getExternalError(InputErrorTypes.NoWatchersAvailable, {}));
    },
    [ReportNames.NoWatchTasksProvided]: function () {
        heading(`Entering interactive mode as you didn't provide a watcher to run`)
    },
    [ReportNames.Watchers]: function (report: WatchersReport): string[] {
        const lines = [
            `{yellow:+} Watching...`
        ];
        report.data.watchTasks.forEach(function (watchTask) {
            const o = archy({
                label: `{yellow:+ input: '${watchTask.name}'}`, nodes: watchTask.watchers.map(getWatcherNode)
            });
            lines.push(multiLineTree(o));
        });
        return lines;
    },
    [ReportNames.WatcherNames]: logWatcherNames,
    [ReportNames.NoFilesMatched]: function (watcher: Watcher) {
        l('{red:x warning} `{cyan:%s}` did not match any files', watcher.patterns.join(' '));
    },

    [ReportNames.WatcherTriggeredTasks]: function(index: number, taskCollection: TaskCollection) {
        l(`{yellow:+} [${index}] ${getTaskCollectionList(taskCollection).join(', ')}`);
    },
    [ReportNames.WatcherTriggeredTasksCompleted]: function (index: number, taskCollection: TaskCollection, time: number) {
        l(`{green:✔} [${index}] ${getTaskCollectionList(taskCollection).join(', ')} {yellow:(${duration(time)})}`);
    },
    [ReportNames.DocsGenerated]: function docsGenerated(tasks, markdown) {

        // Todo - should we always output to the console?
        // l(`{green:✔} Documentation generated - copy/paste the following markdown into a readme.md file`);
        // console.log(markdown);
    },
    [ReportNames.DocsInputFileNotFound]: function (error: DocsInputFileNotFoundError) {
        heading(`Sorry, there were errors resolving your input files`);
        logger.info(`{red.bold:x '${error.file.resolved}'}`);
        multiLine(getExternalError(error.type, error));
    },
    [ReportNames.DocsAddedToFile]: function (file: ExternalFileContent, content: string) {
        logger.info(`{green:✔} Docs added to: {cyan.bold:${file.relative}}`);
    },
    [ReportNames.DocsOutputFileExists]: function (error: DocsOutputFileExistsError) {
        logger.info(`{red.bold:x '${error.file.resolved}'}`);
        multiLine(getExternalError(error.type, error));
    },
    [ReportNames.Summary]: reportSummary,
    [ReportNames.HashDirError]: function (error, cwd: string) {
        // const message = error.toString();
        logger.info(`{red.bold:x CB-History hash failed} (tasks will still run)`);
        multiLine(getExternalError(error.type, error, cwd));
    }
};

export interface IncomingReport {
    type: ReportNames
    data?: any
}

export interface OutgoingReport {
    origin: ReportNames
    data?: string
}

export default function (report: IncomingReport, observer: Rx.Observer<OutgoingReport>) {
    if (typeof reporterFunctions[report.type] === 'function') {
        const output = reporterFunctions[report.type](report);
        if (typeof output === 'string') {
            if (output === '') return;
            observer.onNext({origin: report.type, data: output});
        } else if (Array.isArray(output)) {
            output.forEach(function (item) {
                observer.onNext({origin: report.type, data: item});
            })
        } else {
            console.log('STRING or ARRAY not returned for', report.type);
        }
    }
    

    // console.log(`Reporter not defined for '${name}' Please implement this method`);
}
