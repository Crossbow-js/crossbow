import {WatchTask} from "../watch.resolve";
import {WatchTaskNameNotFoundError} from "../watch.errors";

module.exports = (error: WatchTaskNameNotFoundError, task: WatchTask) =>

    `{red:-} {bold:Description}: {cyan:'${task.name}'} Not found in your configuration`;
