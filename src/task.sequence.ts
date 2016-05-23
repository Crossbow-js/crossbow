import {TaskTypes, TaskRunModes} from "./task.resolve";
const _ = require('../lodash.custom');
const merge = require('../lodash.custom').merge;
const assign = require('object-assign');
const Rx = require('rx');
const Observable = Rx.Observable;

import * as adaptors from "./adaptors";
import {Task} from "./task.resolve.d";
import {CommandTrigger} from "./command.run";
import {Runner} from "./runner";
import {
    SequenceItemTypes,
    SequenceItem,
    TaskFactory,
    createSequenceParallelGroup,
    createSequenceSeriesGroup,
    createSequenceTaskItem
} from "./task.sequence.factories";

import {createObservableFromSequenceItem, TaskReportType} from "./task.runner";
import {TaskReport} from "./task.runner";
import {isInternal} from "./task.utils";

export function createFlattenedSequence(tasks: Task[], trigger: CommandTrigger): SequenceItem[] {

    return flatten(tasks, []);

    function flatten(items: Task[], initial: SequenceItem[]): SequenceItem[] {

        return items.reduce((all, task: Task) => {

            /**
             * If the current task has child tasks, we build a tree of
             * nested observables for it (a task with children cannot itself
             * be a task that should be run)
             */
            if (task.tasks.length) {

                /**
                 * If the current task was marked as `parallel`, all immediate children
                 * of (this task) will be run in `parallel`
                 */
                if (task.runMode === TaskRunModes.parallel) {
                    return all.concat(createSequenceParallelGroup({
                        taskName: task.taskName,
                        items: flatten(task.tasks, [])
                    }));
                }
                /**
                 * If the current task was marked as `series`, all immediate child tasks
                 * will be queued and run in series - each waiting until the previous
                 * one has completed
                 */
                if (task.runMode === TaskRunModes.series) {
                    return all.concat(createSequenceSeriesGroup({
                        taskName: task.taskName,
                        items: flatten(task.tasks, []),
                    }));
                }
            }

            /**
             * At this point, we must be dealing with a task that should be run,
             * so we first check if it's an adaptor @ task first
             */
            if (task.type === TaskTypes.Adaptor) {
                return all.concat(getSequenceItemWithOptions(
                    task,
                    trigger,
                    adaptors[task.adaptor].create(task, trigger),
                    {}
                ));
            }

            /**
             * Finally, if the does not have children tasks & is not an
             * adaptor task it must have at least 1 associated module
             * (or an inline function) so we can begin working with it
             * by first resolving the top-level options object for it.
             */
            const localOptions = loadTopLevelOptions(task, trigger);
            const callable = (function () {
                if (task.type === TaskTypes.InlineFunction) {
                    return task.inlineFunctions[0];
                }
                return require(task.externalTasks[0].resolved);
            })();
            return all.concat(resolveFromFunction(task, callable, trigger, localOptions));
        }, initial);
    }
}

/**
 * If the current TaskType is an InlineFunction or
 * module to be run,
 */
function resolveFromFunction (task: Task, callable: ()=>any, trigger: CommandTrigger, localOptions:{}): SequenceItem[] {

    /**
     * If the current item has no sub-tasks, we can return early
     * with a simple task creation using the global options
     *
     * eg:
     *      $ crossbow run sass
     *
     * options:
     *      sass:
     *        input:  "core.scss"
     *        output: "core.css"
     *
     * -> `sass` task will be run with the options
     *    {input: "core.scss", output: "core.css"}
     */
    if (!task.subTasks.length) {
        return getSequenceItemWithOptions(task, trigger, callable, localOptions);
    }

    /**
     * Now we know for sure that this task has `subTasks`
     * so if the first entry in the subTasks array is a `*` - then
     * the user wants to run all tasks under this options
     * object. So we need to get the keys and use each one as a lookup
     * on the local options.
     *
     * eg:
     *      $ crossbow run sass:*
     *
     * options:
     *   sass:
     *     site:  {input: "core.scss"}
     *     debug: {input: "debug.scss"}
     *
     * lookupKeys = ['site', 'debug']
     */
    const lookupKeys = (function () {
        if (task.subTasks[0] === '*') {
            return Object.keys(localOptions);
        }
        return task.subTasks;
    })();

    /**
     * Now generate 1 task per lookup key.
     */
    return lookupKeys.reduce((acc, optionKey) => {
        /**
         * `optionKey` here will be a string that represented the subTask
         * name, so we use that to try and find a child key
         * in the options that matched it.
         * */
        const currentOptionObject = _.get(localOptions, optionKey);
        const sequenceItems = getSequenceItemWithOptions(task, trigger, callable, currentOptionObject)
                .map(seqItem => {
                    seqItem.subTaskName = optionKey;
                    return seqItem;
                });

        return acc.concat(sequenceItems);
    }, []);
}

function getSequenceItemWithOptions(task: Task, trigger: CommandTrigger, imported: TaskFactory, options): SequenceItem[] {

    /**
     * Merge incoming options with query + flags
     * eg:
     *     $  sass?input=css/core.css --production
     *     -> sass
     *          input: css/core.css
     *          production: true
     */

    const mergedOptionsWithQuery = merge({}, options, task.query, task.flags);

    /**
     * If the module did not export a function, but has a 'tasks'
     * property that is an array, use each function from it
     * eg:
     *  module.exports.tasks = [sass, cssmin, version-rev]
     */
    if (imported.tasks && Array.isArray(imported.tasks)) {
        return imported.tasks.map(function (importedFn, i) {
            return createSequenceTaskItem({
                fnName: getFunctionName(imported, i + 1),
                factory: importedFn,
                task: task,
                options: mergedOptionsWithQuery
            })
        });
    }

    /**
     * If the module exported a function, use that as the factory
     * and return a single task for it.
     * eg:
     *  module.exports = function runSass() {}
     */
    if (typeof imported === 'function') {
        return [createSequenceTaskItem({
            fnName: getFunctionName(imported, 0),
            factory: imported,
            task: task,
            options: mergedOptionsWithQuery,
        })]
    }
}

/**
 * For reporting purposes, try to 'name' a function
 */
function getFunctionName(fn: TaskFactory, count = 0): string {
    if (fn.name === undefined) {
        return `Anonymous Function ${count}`;
    }
    return fn.name;
}

/**
 *           *****************
 * Where the **--~~Magic~~--** happens!!!
 *           *****************
 *
 * Creating a task runner in crossbow is really about
 * wrapping the process of running the tasks in a way
 * that allows comprehensive logging/reporting
 *
 * Series & Parallel have different symantics and are
 * therefor handled separately.
 *
 * Note that everything here is completely lazy and
 * nothing will be executed until a user calls subscribe
 */
export function createRunner(items: SequenceItem[], trigger: CommandTrigger): Runner {
    return {
        sequence: items,
        series: () => {
            const flattened = createObservableTree(items, [], false);
            const subject = new Rx.ReplaySubject(2000);
            Observable.from(flattened)
                .concatAll()
                .catch(x => {
                    subject.onCompleted();
                    return Rx.Observable.empty();
                })
                /**
                 * Push any messages into the subject
                 */
                .do(subject)
                .subscribe();
            return subject;
        },
        parallel: () => {
            const flattened = createObservableTree(items, [], true);
            const subject = new Rx.ReplaySubject(2000);
            Observable.from(flattened)
                .mergeAll()
                .do(subject)
                .subscribe(x => {
                }, e=> {
                }, _=> {
                    subject.onCompleted();
                    // debug('Parallel sequence complete');
                });
            return subject;
        }
    };

    /**
     * Any task in 'Parallel' run mode that throws an
     * error should not adversely affect sibling tasks
     */
    function shouldCatch(trigger) {
        return trigger.config.runMode === TaskRunModes.parallel;
    }

    /**
     * Create a nested tree of Observables that can contain tasks
     * alongside parallel/series groups. To understand how this works
     * you can think of the following to be an accurate representation of
     * what this function produces:
     *
     * const out = [
         Observable.concat(
             task1(),
             task2()
         ),
         Observable.concat(
             task3(),
             task4(),
             Observable.concat(
                 task5(),
                 task6(),
                 task7()
             )
         )
     ];
     *
     */
    function createObservableTree(items: SequenceItem[], initial: SequenceItem[], addCatch = false) {

        return items.reduce((all, item: SequenceItem) => {

            let output;
            /**
             * If the current task was marked as `parallel`, all immediate children
             * of (this task) will be run in `parallel`
             */
            if (item.type === SequenceItemTypes.ParallelGroup) {
                output = Observable.merge(createObservableTree(item.items, [], shouldCatch(trigger)));
            }
            /**
             * If the current task was marked as `series`, all immediate child tasks
             * will be queued and run in series - each waiting until the previous
             * one has completed
             */
            if (item.type === SequenceItemTypes.SeriesGroup) {
                output = Observable.concat(createObservableTree(item.items, [], false));
            }

            /**
             * Finally is item is a task, create an observable for it.
             */
            if (item.type === SequenceItemTypes.Task && item.factory) {
                output = createObservableFromSequenceItem(item, trigger);
            }

            /**
             * Should we add a catch clause to this item to enable
             * siblings to continue when a task errors
             */
            if (addCatch || !trigger.config.fail) {
                return all.concat(output.catch(x => Rx.Observable.empty()));
            }

            return all.concat(output);

        }, initial);
    }
}

/**
 * From user input, try to locate a options object
 */
function loadTopLevelOptions(task: Task, trigger: CommandTrigger): {} {

    // todo - more robust/featurefull way of matching options -> tasks

    const fullMatch = _.get(trigger.input.options, [task.taskName]);

    if (fullMatch !== undefined) {
        return fullMatch;
    }

    if (isInternal(task.rawInput)) {
        const lookup = task.taskName.replace(/(.+?)_internal_fn_\d{0,10}/, '');
        const fromInternal = _.get(trigger.input.options, [lookup]);
        if (fromInternal !== undefined) {
            return fromInternal;
        }
    }

    return {};
}

/**
 * After a bunch of tasks have run, we need to link up task-ended reports
 * with their original position in the sequence. This will allow us to
 * reconstruct the task render-tree but also show any tasks that errored
 * or did not complete
 * @param sequence
 * @param reports
 * @returns {*}
 */
export function decorateSequenceWithReports(sequence: SequenceItem[], reports: TaskReport[]) {
    return addMany(sequence, []);
    function addMany(sequence, initial) {
        return sequence.reduce(function (all, item) {
            const c = assign({}, item);
            if (item.type === SequenceItemTypes.Task) {
                c.stats = getMergedStats(item, reports);
                return all.concat(c);
            } else {
                c.items = addMany(item.items, []);
                return all.concat(c);
            }
        }, initial);
    }
}

/**
 * Look at every item in the sequence tree and count how many
 * error have occured
 */
export function countSequenceErrors(items: SequenceItem[]): number {
    return items.reduce((acc, item) => {
        if (item.type === SequenceItemTypes.Task) {
            const errors = _.get(item, 'stats.errors', []);
            if (errors.length) {
                return acc + errors.length;
            }
            return acc;
        }
        return acc + countSequenceErrors(item.items);
    }, 0);
}

/**
 * Look at the reports array to find stats linked to a
 * given task
 */
function getMergedStats(item: SequenceItem, reports: TaskReport[]): {} {

    const match = reports.filter((report) => {
        return report.item.seqUID === item.seqUID;
    });

    const start = match.filter(x => x.type === TaskReportType.start)[0];
    const error = match.filter(x => x.type === TaskReportType.error)[0];
    const end   = match.filter(x => x.type === TaskReportType.end)[0];

    if (start && end) {
        return assign({}, start.stats, end.stats);
    }

    if (start && error) {
        return assign({}, start.stats, error.stats);
    }

    if (start) {
        return assign({}, start.stats);
    }

    return {item: item, errors: []};
}
