import {WatchTask} from "../watch.resolve";
import {WatchTaskNameNotFoundError} from "../watch.errors";

module.exports = (task: WatchTask, error: WatchTaskNameNotFoundError) =>

`{red:-} {bold:Description}: {cyan:'${task.name}'} Not found in your configuration`;
