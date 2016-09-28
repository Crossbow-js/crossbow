import {CommandTrigger, getRunCommandSetup} from "./command.run";
import {ReportTypes} from "./reporter.resolve";
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

const debug = require('debug')('cb:command.run.execute');

export enum RunCommandReportTypes {
    InvalidTasks = <any>"InvalidTasks",
    Complete = <any>"Complete"
}
export interface RunCommandSetupErrors {
    type: RunCommandReportTypes
}
export type RunComplete = Rx.Observable<RunCommandCompletionReport>
export interface RunCommandCompletionReport {
    tasks: Tasks,
    sequence: SequenceItem[]
    runner: Runner
    config: CrossbowConfiguration
    type: RunCommandReportTypes
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

export default function executeRunCommand(trigger: CommandTrigger): Rx.Observable<RunCommandCompletionReport> {

    const {cli, input, config, reporter} = trigger;
    const {tasks, sequence, runner}      = getRunCommandSetup(trigger);

    if (trigger.config.dump) {
        writeFileSync(join(trigger.config.cwd, `_tasks.json`), JSON.stringify(tasks, null, 2));
        writeFileSync(join(trigger.config.cwd, `_sequence.json`), JSON.stringify(sequence, null, 2));
        writeFileSync(join(trigger.config.cwd, `_config.json`), JSON.stringify(trigger.config, null, 2));
    }

    /**
     * Never continue if any tasks were flagged as invalid and we've not handed
     * off
     */
    if (tasks.invalid.length) {

        reporter({
            type: ReportTypes.TaskErrors,
            data: {
                tasks: tasks.all,
                taskCollection: cli.input.slice(1),
                input,
                config
            }
        } as TaskErrorsReport);

        return Rx.Observable.just({
            errors: [
                {type: RunCommandReportTypes.InvalidTasks}
            ],
            taskErrors: [],
            tasks,
            sequence,
            runner,
            config,
            type: RunCommandReportTypes.InvalidTasks
        });
    }

    debug(`~ run mode from config in mode: '${config.runMode}'`);

    /**
     * Report task list that's about to run
     */
    reporter({type: ReportTypes.TaskList, data: {sequence, cli, titlePrefix: '', config}});

    /**
     * Get a run context for this execution.
     * note: This could take some time as it may need
     * to hash directories etc. A run context is just a key=>value
     * map of read-only values.
     */
    return getContext(tasks.all, trigger)
        .timestamp(trigger.config.scheduler)
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
    function run(runContext: RunContext, startTime: number): Rx.Observable<RunCommandCompletionReport> {

        /**
         * series/parallel running have VERY different characteristics
         * @type {Rx.Observable<TaskReport>|Rx.Observable<TaskReport>}
         */
        const mode = (function () {
            if (trigger.config.runMode === TaskRunModes.parallel) {
                return runner.parallel(runContext);
            }
            return runner.series(runContext);
        })();

        /**
         * Now add side effects
         */
        return mode
            .do(report => trigger.tracker.onNext(report)) // propagate reports into tracker
            .do((report: TaskReport) => {
                reporter({type: ReportTypes.TaskReport, data: {report, trigger}});
            })
            .toArray()
            .timestamp(trigger.config.scheduler)
            .flatMap((complete: CompletionReport) => {
                return handleCompletion(complete.value, complete.timestamp - startTime)
            });
    }

    /**
     * Because errors are handled by reports, task executions ALWAYS complete
     * and we handle that here.
     */
    function handleCompletion (reports: TaskReport[], runtime: number): Rx.Observable<RunCommandCompletionReport> {

        /**
         * Merge sequence tree with Task Reports
         */
        const decoratedSequence = seq.decorateSequenceWithReports(sequence, reports);

        /**
         * Did any errors occur in this run?
         * @type {TaskReport[]}
         */
        const errors = reports.filter(x => x.type === TaskReportType.error);

        /**
         * Main summary report
         */
        reporter({
            type: ReportTypes.Summary,
            data: {
                errors: errors,
                sequence: decoratedSequence,
                cli,
                title: 'Total:',
                config,
                runtime
            }
        } as SummaryReport);

        /**
         * Push a 'Completion report' onto the $complete Observable.
         * This means consumers will get everything when they call
         */
        return Rx.Observable.just({
            type: RunCommandReportTypes.Complete,
            reports,
            tasks,
            sequence,
            runner,
            decoratedSequence,
            runtime: runtime,
            config,
            errors: [],
            taskErrors: reports.filter(x => x.type === TaskReportType.error)
        });
    }
}
