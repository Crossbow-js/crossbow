const objPath = require('object-path');
const merge   = require('lodash.merge');
const assign  = require('object-assign');
const Rx      = require('rx');
const Observable = Rx.Observable;

import * as adaptors from "./adaptors";
import {Task} from "./task.resolve";
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

import {createObservableFromSequenceItem} from "./task.runner";
import {TaskReport} from "./task.runner";

export function createFlattenedSequence (tasks: Task[], trigger: CommandTrigger): SequenceItem[] {

    return flatten(tasks, []);

    function flatten(items: Task[], initial: SequenceItem[]): SequenceItem[] {

        function reducer(all, task: Task) {


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
                if (task.runMode === 'parallel') {
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
                if (task.runMode === 'series') {
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
            if (task.adaptor) {
                return all.concat(getSequenceItemWithConfig(
                    task,
                    trigger,
                    adaptors[task.adaptor].create(task, trigger),
                    {}
                ));
            }

            /**
             * Finally, if the does not have children tasks & is not an
             * adaptor task it must have at least 1 associated module
             * so we can begin working with it by first resolving
             * the top-level configuration object for it.
             */
            const localConfig = loadTopLevelConfig(task, trigger);
            /**
             * Next we load the module
             */
            const imported    = require(task.modules[0]);

            /**
             * If the current item has no sub-tasks, we can return early
             * with a simple task creation using the global config
             *
             * eg:
             *      $ crossbow run sass
             *
             * config:
             *      sass:
             *        input:  "core.scss"
             *        output: "core.css"
             *
             * -> `sass` task will be run with the configuration
             *    {input: "core.scss", output: "core.css"}
             */
            if (!task.subTasks.length) {
                return all.concat(getSequenceItemWithConfig(task, trigger, imported, localConfig));
            }

            /**
             * Now we know for sure that this task has `sub-items`
             * so if the first entry in the subTasks array is a `*` - then
             * the user wants to run all tasks under this configuration
             * object. So we need to get the keys and use each one as a lookup
             * on the local configuration.
             *
             * eg:
             *      $ crossbow run sass:*
             *
             * config:
             *   sass:
             *     site:  {input: "core.scss"}
             *     debug: {input: "debug.scss"}
             *
             * lookupKeys = ['site', 'debug']
             */
            const lookupKeys = task.subTasks[0] === '*'
                ? Object.keys(localConfig)
                : task.subTasks;

            /**
             * Now use each lookup key to generate a task
             * that uses the config object it points to
             */
            return all.concat(lookupKeys
                /**
                 * At this point, the reducer callback will be called once with each matched
                 * configuration item - this can then be used to generate a task with
                 * that localised configuration
                 */
                .reduce((acc, key) => {
                    /**
                     * `configKey` here will be a string that represented the subTask
                     * name, so we use that to try and find a child key
                     * in the config that matched it.
                     * */
                    const currentConfigObject = objPath.get(localConfig, key);
                    const sequenceItems =
                        getSequenceItemWithConfig(task, trigger, imported, currentConfigObject)
                            .map((seqItem: SequenceItem) => {
                                seqItem.subTaskName = key;
                                return seqItem;
                            });

                    return acc.concat(sequenceItems);
                }, [])
            );
        }
        return items.reduce(reducer, initial);
    }
}
function getSequenceItemWithConfig (task: Task, trigger: CommandTrigger, imported: TaskFactory, config): SequenceItem[] {

    /**
     * If the module did not export a function, but has a 'tasks'
     * property that is an array, use each function from it
     * eg:
     *  module.exports.tasks [sass, cssmin, version-rev]
     */
    const mergedConfigWithQuery = merge({}, config, task.query);

    if (imported.tasks && Array.isArray(imported.tasks)) {
        return imported.tasks.map(function (importedFn, i) {
            return createSequenceTaskItem({
                fnName: getFunctionName(imported, i),
                factory: importedFn,
                task: task,
                config: mergedConfigWithQuery
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
            config: mergedConfigWithQuery,
        })]
    }
}
function getFunctionName (fn: TaskFactory, count = 0) {
    if (fn.name === undefined) {
        return `AnonymousFunction ${count}`;
    }
    return fn.name;
}
export function createRunner (items: SequenceItem[], trigger: CommandTrigger): Runner  {

    return {
        sequence: items,
        series: () => {
            const flattened = flatten(items, []);
            const subject = new Rx.ReplaySubject(2000);
            Observable.from(flattened)
                .concatAll()
                .catch(x =>{
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
            const flattened = flatten(items, [], true);
            const subject = new Rx.ReplaySubject(2000);
            Observable.from(flattened)
                .mergeAll()
                .do(subject)
                .subscribe(x => {}, e=>{}, _=> {
                    subject.onCompleted();
                    // debug('Parallel sequence complete');
                });
            return subject;
        }
    };

    function shouldCatch(trigger) {
        return trigger.config.runMode === 'parallel';
    }

    /**
     * If the current task has child tasks, we build a tree of
     * nested observables for it (a task with children cannot itself
     * be a task that should be run)
     */
    function flatten(items: SequenceItem[], initial: SequenceItem[], addCatch = false) {

        function reducer(all, item: SequenceItem) {
            let output;
            /**
             * If the current task was marked as `parallel`, all immediate children
             * of (this task) will be run in `parallel`
             */
            if (item.type === SequenceItemTypes.ParallelGroup) {
                output = Observable.merge(flatten(item.items, [], shouldCatch(trigger)));
            }
            /**
             * If the current task was marked as `series`, all immediate child tasks
             * will be queued and run in series - each waiting until the previous
             * one has completed
             */
            if (item.type === SequenceItemTypes.SeriesGroup) {
                output = Observable.concat(flatten(item.items, []));
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
            if (addCatch) {
                return all.concat(output.catch(x => Rx.Observable.empty()));
            }

            return all.concat(output);
        }

        return items.reduce(reducer, initial);
    }
}

function loadTopLevelConfig(task: Task, trigger: CommandTrigger): any {
    return objPath.get(trigger.input.config, [task.taskName], {});
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
export function decorateCompletedSequenceItemsWithReports (sequence: SequenceItem[], reports: TaskReport[]) {
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

export function countSequenceErrors (items: SequenceItem[]) {
    return items.reduce((acc, item) => {
        if (item.type === SequenceItemTypes.Task) {
            const errors = objPath.get(item, 'stats.errors', []);
            if (errors.length) {
                return acc + 1;
            }
            return acc;
        }
        return acc + countSequenceErrors(item.items);
    }, 0);
}

function getMergedStats (item, reports) {
    // console.log('--called');
    const match = reports.filter((x: TaskReport) => {
        return x.item.seqUID === item.seqUID;
    });
    const start = match.filter(x => x.type === 'start')[0];
    const end   = match.filter(x => x.type === 'end')[0];
    const error = match.filter(x => x.type === 'error')[0];

    if (start && end) {
        return assign({}, start.stats, end.stats, {type: 'complete'});
    }

    if (start && error) {
        return assign({}, start.stats, error.stats);
    }

    if (start) {
        return assign({}, start.stats, {type: 'not-completed'});
    }

    return {type: 'not-started', item: item, errors: []};
}
