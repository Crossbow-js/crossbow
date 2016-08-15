import {Task} from "./task.resolve";
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

            // const property = 'if';

            applyBooleanPropertyToChildren(tasks, false, 'if', '');

            function applyBooleanPropertyToChildren (tasks: Task[], add: boolean, property, value?) {
                tasks.forEach(function (task) {
                    if (add) {
                        task[property] = value;
                    }
                    if (task[property]) {
                        if (task.tasks.length) {
                            applyBooleanPropertyToChildren(task.tasks, true, property, task.if);
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
