import {WatchTasks} from "./watch.resolve";
import {Tasks} from "./task.resolve";
import {Watcher} from "./watch.resolve";
import {WatchRunners} from "./command.watch";
const debug = require('debug')('cb:watch.runner');

export interface WatchTaskRunner {
    tasks: WatchTasks,
    // beforeTasks: Tasks
    runners: WatchRunners
}
