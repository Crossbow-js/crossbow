import {Task} from "../task.resolve";
import {SubtaskNotFoundError} from "../task.errors";

module.exports = (error: SubtaskNotFoundError, task: Task) =>

    `{red:-} {bold:Description}: Options under the path {yellow:${task.taskName}} -> {yellow:${error.name}} was not found.
  This means {cyan:'${task.rawInput}'} is not a valid way to run a task.`;
