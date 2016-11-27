import {CommandTrigger, getRunCommandSetup, RunCommandSetup} from "./command.run";
import {ReportTypes, TaskReportReport} from "./reporter.resolve";
import {Tasks, TaskRunModes} from "./task.resolve";
import {SequenceItem} from "./task.sequence.factories";
import {Runner, RunContext, TaskErrorStats} from "./task.runner";
import {TaskReport, TaskReportType} from "./task.runner";
import {writeFileSync} from "fs";
import {join} from "path";
import Rx = require('rx');
import * as seq from "./task.sequence";
import getContext from "./command.run.context";
import {SummaryReport, TaskErrorsReport} from "./reporter.resolve";
import {CrossbowConfiguration} from "./config";
import {CLI} from "./index";

const debug = require('debug')('cb:command.run.execute');

export enum RunCommandReportTypes {
    InvalidTasks    = <any>"InvalidTasks",
    NoTasks         = <any>"NoTasks",
    Setup           = <any>"Setup",
    Complete        = <any>"Complete",
    TaskReport      = <any>"TaskReport",
    NoTasksProvided = <any>"NoTasksProvided"
}
export interface RunCommandSetupErrors {
    type: RunCommandReportTypes
}

export interface RunCommandReport<T> {
    type: RunCommandReportTypes
    data: T
}

export type RunComplete = Rx.Observable<RunCommandReport<RunCommandCompletionReport|TaskReport>>


export interface RunCommandCompletionReport {
    tasks: Tasks,
    sequence: SequenceItem[]
    runner: Runner
    config: CrossbowConfiguration
    reports?: TaskReport[]
    decoratedSequence?: SequenceItem[]
    runtime?: number
    errors: RunCommandSetupErrors[]
    taskErrors: TaskReport[]
}

export interface CompletionReport {
    timestamp: number
    value: TaskReport[]
}
export interface RunContextCompletion {
    timestamp: number
    value: RunContext
}

export default function (runCommandSetup: RunCommandSetup, config: CrossbowConfiguration): RunComplete {

    const {tasks, sequence, runner} = runCommandSetup;

    /**
     * Get a run context for this execution.
     * note: This could take some time as it may need
     * to hash directories etc. A run context is just a key=>value
     * map of read-only values.
     */
    return getContext(tasks.all, config)
        .timestamp(config.scheduler)
        .flatMap((complete: RunContextCompletion) => {
            return run(complete.value, complete.timestamp)
        })
        .share();

    /**
     * Return the stream so a consumer can receive the RunCompletionReport
     */

    /**
     * Now actually execute the tasks.
     */
    function run(runContext: RunContext, startTime: number): RunComplete {

        /**
         * series/parallel running have VERY different characteristics
         * @type {Rx.Observable<TaskReport>|Rx.Observable<TaskReport>}
         */
        const mode = (function () {
            if (config.runMode === TaskRunModes.parallel) {
                return runner.parallel(runContext);
            }
            return runner.series(runContext);
        })();

        /**
         * Now add side effects
         */
        const records = new Rx.ReplaySubject();
        const each = mode
            // .do(report => trigger.tracker.onNext(report)) // TODO: propagate reports into tracker
            .do(records)
            .map(x => {
                return {
                    type: RunCommandReportTypes.TaskReport,
                    data: x
                }
            });

        const complete = records
            .toArray()
            .timestamp(config.scheduler)
            .flatMap((complete: CompletionReport) => {
                return handleCompletion(complete.value, complete.timestamp - startTime)
            });

        return Rx.Observable.concat(each, complete);
    }

    /**
     * Because errors are handled by reports, task executions ALWAYS complete
     * and we handle that here.
     */
    function handleCompletion (reports: TaskReport[], runtime: number): RunComplete {

        /**
         * Merge sequence tree with Task Reports
         */
        const decoratedSequence = seq.decorateSequenceWithReports(sequence, reports);

        /**
         * Push a 'Completion report' onto the $complete Observable.
         * This means consumers will get everything when they call
         */
        return Rx.Observable.just({
            type: RunCommandReportTypes.Complete,
            data: {
                reports,
                tasks,
                sequence,
                runner,
                decoratedSequence,
                runtime: runtime,
                config,
                errors: [],
                taskErrors: reports.filter(x => x.type === TaskReportType.error)
            }
        });
    }
}
