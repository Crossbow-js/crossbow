import {CommandTrigger, getRunCommandSetup} from "./command.run";
import {ReportNames} from "./reporter.resolve";
import {Tasks} from "./task.resolve";
import {SequenceItem} from "./task.sequence.factories";
import {Runner} from "./task.runner";
import {TaskReport, TaskReportType} from "./task.runner";
import {writeFileSync} from "fs";
import {join} from "path";
import Rx = require('rx');
import * as seq from "./task.sequence";

const debug = require('debug')('cb:command.run.execute');

export enum RunCommandReportTypes {
    InvalidTasks = <any>"InvalidTasks",
    Complete = <any>"Complete"
}

export interface RunCommandErrorReport {
    type: RunCommandReportTypes
    tasks: Tasks,
    sequence: SequenceItem[]
    runner: Runner
}

export interface RunCommandCompletionReport extends RunCommandErrorReport {
    type: RunCommandReportTypes
    reports: TaskReport[]
    decoratedSequence: SequenceItem[]
    runtime: number
}

export type RunCommandErrorStream = RunCommandErrorReport|Error;

export default function executeRunCommand(trigger: CommandTrigger): Rx.Observable<RunCommandErrorStream|RunCommandCompletionReport> {

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
        reporter(ReportNames.TaskErrors, tasks.all, cli.input.slice(1), input, config);
        return Rx.Observable.concat<RunCommandErrorStream>(
            Rx.Observable.just(<RunCommandErrorReport>{
                type: RunCommandReportTypes.InvalidTasks,
                tasks,
                sequence,
                runner
            }),
            Rx.Observable.throw(new Error(`RunCommandErrorTypes.InvalidTasks`))
        );
    }

    debug(`~ run mode from config in mode: '${config.runMode}'`);

    /**
     * Report task list that's about to run
     */
    reporter(ReportNames.TaskList, sequence, cli, '', config);

    /**
     * A generic timestamp to mark the beginning of the tasks
     * @type {number}
     */
    const timestamp = new Date().getTime();
    const complete$ = new Rx.Subject<RunCommandCompletionReport>();

    const run$ = runner[trigger.config.runMode]
        .call()
        .do(report => trigger.tracker.onNext(report))
        .do((report: TaskReport) => {
            if (trigger.config.progress) {
                reporter(ReportNames.TaskReport, report, trigger);
            }
        })
        .toArray()
        .do(reports => {

            const decoratedSequence = seq.decorateSequenceWithReports(sequence, reports);
            const errors            = reports.filter(x => x.type === TaskReportType.error);
            const runtime           = new Date().getTime() - timestamp;

            complete$.onNext({
                type: RunCommandReportTypes.Complete,
                reports,
                tasks,
                sequence,
                runner,
                decoratedSequence,
                runtime
            });

            reporter(ReportNames.Summary, decoratedSequence, cli, 'Total: ', config, runtime);

            if (errors.length > 0 && config.fail) {
                const lastError = errors[errors.length-1];
                if (lastError.stats.cbExitCode !== undefined) {
                    process.exit(lastError.stats.cbExitCode);
                }
                process.exit(1);
            } else {
                complete$.onCompleted();
            }
        })
        .subscribe();

    return complete$;
}