import {WatchTasks} from "./watch.resolve";
const debug = require('debug')('cb:watch.runner');

export interface WatchTaskRunner {
    tasks: WatchTasks
}