const debug = require("debug")("cb:task.transform");
import {Task} from "./task.resolve";
import {TaskTypes, TaskOriginTypes} from "./task.resolve";

export interface TaskTransform {
    predicate: (incoming: Task) => boolean;
    fn: (incoming: Task) => Task;
}

/**
 * Task Transformations
 * This gives an opportunity to change a task just before error collection
 */
export const transforms = {
    /**
     * If an external file was matched, and it has the .sh extension,
     * load it as an @sh adaptor task
     */
    "@sh from File": {
        predicate (incoming: Task): boolean {
            return incoming.type === TaskTypes.ExternalTask &&
                incoming.externalTasks[0].parsed.ext === ".sh";
        },
        fn (incoming: Task): Task {
            incoming.type    = TaskTypes.Adaptor;
            incoming.origin  = TaskOriginTypes.FileSystem;
            incoming.adaptor = "sh";
            incoming.command = ""; // Will read later
            return incoming;
        }
    }
};

/**
 * Allow transformations on tasks before error collections
 */
export function applyTransforms(incoming: Task): Task {
    return Object.keys(transforms).reduce(function (task, key) {
        const transform: TaskTransform = transforms[key];
        if (transform.predicate(task)) {
            debug(`Applying transform ${key}`);
            return transform.fn(task);
        }
        return incoming;
    }, incoming);
}
