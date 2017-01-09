import {CommandTrigger, getRunCommandSetup} from "./command.run";
import {ReportTypes} from "./reporter.resolve";
import {Tasks, TaskRunModes} from "./task.resolve";
import {SequenceItem} from "./task.sequence.factories";
import {Runner, RunContext} from "./task.runner";
import {TaskReport} from "./task.runner";
import Rx = require('rx');
import getContext from "./command.run.context";
import {TaskErrorsReport} from "./reporter.resolve";
import {CrossbowConfiguration} from "./config";
import {CLI} from "./index";

const debug = require('debug')('cb:command.run.execute');

export enum RunCommandReportTypes {
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

export default function executeRunCommand(trigger: CommandTrigger): RunActions {

    const {cli, input, config, reporter} = trigger;
    const {tasks, sequence, runner}      = getRunCommandSetup(trigger);

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
            } as TaskErrorsReport
        });

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
