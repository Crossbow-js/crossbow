import {Task, TaskTypes} from "./task.resolve";
const _ = require('../lodash.custom');
const debug = require('debug')('cb:task.tree.transform');

export interface TaskTreeTransform {
    predicate: (incoming:Task[]) => boolean
    fn: (incoming:Task[]) => Task[]
}

function applyBooleanPropertyToChildren (tasks: Task[], skipped: boolean) {
    tasks.forEach(function (task) {
        if (skipped) {
            task.skipped = true;
        }
        if (task.skipped) {
            if (task.tasks.length) {
                applyBooleanPropertyToChildren(task.tasks, true);
                return;
            }
        }
        if (task.tasks.length) {
            applyBooleanPropertyToChildren(task.tasks, false);
        }
    });
}

export const transforms = {

    'Copy options to children' : {
        predicate (tasks: Task[]): boolean {
            return true;
        },
        fn (tasks: Task[]): Task[] {

            pullOptions(tasks);

            function pullOptions(tasks, toApply?) {
                tasks.forEach(function (task) {
                    if (toApply) {
                        if (task.type !== TaskTypes.TaskGroup) {
                            task.options = _.assign({}, task.options, toApply);
                        }
                    }
                    if (task.tasks.length) {
                        if (task.options) {
                            pullOptions(task.tasks, task.options);
                        } else {
                            pullOptions(task.tasks);
                        }
                    }
                })
            }

            return tasks;
        }
    },
    'Add skipped property to children' : {
        predicate (tasks: Task[]): boolean {
            return true;
        },
        fn (tasks: Task[]): Task[] {
            applyBooleanPropertyToChildren(tasks, false);
            return tasks;
        }
    },
    'Add if property to children' : {
        predicate (tasks: Task[]): boolean {
            return true;
        },
        fn (tasks: Task[]): Task[] {

            applyBooleanPropertyToChildren(tasks, false, 'ifChanged', '');

            function applyBooleanPropertyToChildren (tasks: Task[], add: boolean, property, value?) {
                tasks.forEach(function (task) {
                    if (add) {
                        task[property].unshift.apply(task[property], value);
                    }
                    if (task[property].length) {
                        if (task.tasks.length) {
                            applyBooleanPropertyToChildren(task.tasks, true, property, task[property]);
                            return;
                        }
                    }
                    if (task.tasks.length) {
                        applyBooleanPropertyToChildren(task.tasks, false, property);
                    }
                });
            }
            return tasks;
        }
    }
};

/**
 * Allow transformations on tasks before error collections
 */
export function applyTreeTransforms(incoming: Task[]): Task[] {
    return Object.keys(transforms).reduce(function (task, key) {
        const transform: TaskTreeTransform = transforms[key];
        if (transform.predicate(task)) {
            debug(`Applying transform ${key}`);
            return transform.fn(task);
        }
        return incoming;
    }, incoming);
}
