import {WatchTasks} from "./watch.resolve";
import {Tasks} from "./task.resolve";
const debug = require('debug')('cb:watch.runner');

export interface WatchTaskRunner {
    tasks: WatchTasks,
    beforeTasks: Tasks
}
