import {CommandTrigger, getRunCommandSetup} from "./command.run";
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
    InvalidTasks = <any>"InvalidTasks",
    NoTasks      = <any>"NoTasks",
    Setup        = <any>"Setup",
    Complete     = <any>"Complete",
    TaskReport   = <any>"TaskReport"
}
export interface RunCommandSetupErrors {
    type: RunCommandReportTypes
}

export type RunComplete = Rx.Observable<RunActions>

export interface RunActions {
    setup: RunCommandSetup
    update$: Rx.Observable<TaskReport>
}

export interface RunCommandSetup {
    tasks?: Tasks,
    sequence?: SequenceItem[]
    errors: RunCommandSetupErrors[]
}

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
    cli: CLI
}

export interface CompletionReport {
    timestamp: number
    value: TaskReport[]
}
export interface RunContextCompletion {
    timestamp: number
    value: RunContext
}

export default function executeRunCommand(trigger: CommandTrigger): RunActions {

    const {cli, input, config, reporter} = trigger;
    const {tasks, sequence, runner}      = getRunCommandSetup(trigger);

    // if (trigger.config.dump) {
    //     writeFileSync(join(trigger.config.cwd, `_tasks.json`), JSON.stringify(tasks, null, 2));
    //     writeFileSync(join(trigger.config.cwd, `_sequence.json`), JSON.stringify(sequence, null, 2));
    //     writeFileSync(join(trigger.config.cwd, `_config.json`), JSON.stringify(trigger.config, null, 2));
    // }

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

        return {
            setup: {
                sequence,
                tasks,
                errors: []
            },
            update$: <any>Rx.Observable.empty()
        }
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
    return {
        setup: {
            sequence,
            tasks,
            errors: []
        },
        update$: getContext(tasks.all, trigger)
            .flatMap((runContext: RunContext) => {
                if (trigger.config.runMode === TaskRunModes.parallel) {
                    return runner.parallel(runContext);
                }
                return runner.series(runContext);
            }).share()
    };
}
