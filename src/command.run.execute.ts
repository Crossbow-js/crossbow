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
import * as file from "./file.utils";
import {InputErrorTypes} from "./task.utils";

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

    function getIfs(tasks, initial) {
        return tasks.reduce(function (acc, task) {
            if (task.tasks.length) {
                return acc.concat(getIfs(task.tasks, []));
            }
            if (task.if.length) return acc.concat(task.if);
            return acc;
        }, initial);
    }

    function unique (incoming: string[]) {
        const output = [];
        incoming.forEach(function (inc) {
            if (output.indexOf(inc) === -1) output.push(inc);
        });
        return output;
    }

    const ifLookups = unique(getIfs(tasks.all, []));

    if (ifLookups.length) {
        const hd = require('hash-dir');
        const hdAsAbservable = Rx.Observable.fromNodeCallback(hd);
        const existing = file.readOrCreateJsonFile('.crossbow/history.json', trigger.config.cwd);
        console.log(existing);

        Rx.Observable
            .fromArray(ifLookups)
            .withLatestFrom(trigger.shared)
            .flatMap(x => {

                let itemPath = x[0];
                let shared   = x[1];

                return hdAsAbservable(itemPath).map(tree => {
                    return {
                        path: itemPath,
                        hash: tree.hash
                    }
                });
            })
            .catch(function (e) {
                console.log(e); // todo - report directory not found
                return Rx.Observable.empty();
            })
            .toArray()
            .do(x => {
                console.log(x);
            })
            .subscribe(function (value) {
                // console.log(value);
                run();
            });
    } else {
        run();
    }

    function run() {
        runner[trigger.config.runMode] // .series or .parallel
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
    }


    return complete$;
}