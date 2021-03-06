import {WatchTasks} from "./watch.resolve";
import {Watcher} from "./watch.resolve";
import {CommandTrigger} from "./command.run";
import {resolveTasks} from "./task.resolve";
import * as seq from "./task.sequence";
import {BeforeTasks} from "./watch.before";
const debug = require("debug")("cb:watch.runner");
const _ = require("../lodash.custom");

export interface WatchRunners {
    all: Watcher[];
    valid: Watcher[];
    invalid: Watcher[];
}

export interface WatchTaskRunner {
    tasks: WatchTasks;
    runners: WatchRunners;
    before: BeforeTasks;
}

export function createWatchRunners(watchTasks: WatchTasks, ctx: CommandTrigger): WatchRunners {

    const runners = watchTasks.valid.reduce(function (acc, item) {

        return acc.concat(item.watchers.map(function (watcher) {

            const tasks = resolveTasks(watcher.tasks, ctx);

            const subject = _.assign({}, watcher, {
                _tasks: tasks,
                parent: item.name
            });

            if (tasks.invalid.length) {
                return subject;
            }

            subject._sequence = seq.createFlattenedSequence(tasks.valid, ctx);
            subject._runner = seq.createRunner(subject._sequence, ctx);

            return subject;
        }));
    }, []);

    return {
        all: runners,
        valid: runners.filter(x => validateRunner(x)),
        invalid: runners.filter(x => !validateRunner(x)),
    };
}

function validateRunner(x) {
    return x._tasks.invalid.length === 0;
}
