import {Meow} from "./index";
import {WatchTrigger} from "./command.watch";
import {WatchTasks, resolveBeforeTasks} from "./watch.resolve";
import {resolveTasks} from "./task.resolve";
import * as reporter from './reporters/defaultReporter';
import * as seq from "./task.sequence";
import {SequenceItem} from "./task.sequence.factories";
const debug = require("typings/dist/utils/debug");

export function getBeforeTaskRunner (cli: Meow,
                                     trigger: WatchTrigger,
                                     watchTasks: WatchTasks,
                                     tracker$: Rx.Observable<any>): Rx.Observable<any> {
    /**
     * Get 'before' task list
     */
    const beforeTasksAsCliInput = resolveBeforeTasks(trigger.input, watchTasks.valid);

    if (!beforeTasksAsCliInput.length) {
        return Rx.Observable.just(true);
    }

    debug(`Combined global + task specific 'before' tasks [${beforeTasksAsCliInput}]`);

    /**
     * Now Resolve the before task names given in input.
     */
    const beforeTasks = resolveTasks(beforeTasksAsCliInput, trigger);

    if (beforeTasks.invalid.length) {
        reporter.reportBeforeWatchTaskErrors(watchTasks, trigger);
        return Rx.Observable.throw(new Error('Before task resolution failed'));
    }

    const beforeSequence = seq.createFlattenedSequence(beforeTasks.valid, trigger);
    const beforeRunner   = seq.createRunner(beforeSequence, trigger);

    /**
     * Report task list that's about to run
     */
    reporter.reportBeforeTaskList(beforeSequence, cli, trigger.config);

    /**
     * A generic timestamp to mark the beginning of the tasks
     * @type {number}
     */
    const beforeTimestamp = new Date().getTime();
    const report = (seq: SequenceItem[]) => reporter.reportSummary(seq, cli, 'Before tasks Total:', trigger.config, new Date().getTime() - beforeTimestamp);

    return beforeRunner
        .series(tracker$) // todo - should this support parallel run mode also?
        .filter(x => {
            // todo more robust way of determining if the current value was a report from crossbow (could be a task produced value)
            return typeof x.type === 'string';
        })
        .do(report => {
            if (trigger.config.progress) {
                reporter.taskReport(report, trigger);
            }
        })
        .toArray()
        .map((reports): SequenceItem[] => {
            return seq.decorateCompletedSequenceItemsWithReports(beforeSequence, reports);
        })
        .flatMap((incoming: SequenceItem[]) => {
            const errorCount = seq.countSequenceErrors(incoming);
            if (errorCount > 0) {
                report(incoming);
                return Rx.Observable.throw(new Error('Before tasks did not complete!'));
            }
            return Rx.Observable.just(incoming);
        })
        .do(function (incoming: SequenceItem[]) {
            report(incoming);
        });
}