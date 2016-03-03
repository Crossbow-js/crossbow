import {Task} from "../task.resolve";
import {ModuleNotFoundError} from "../task.errors";

module.exports = (task: Task, error: ModuleNotFoundError) =>

`{red:-} {bold:Description}: {cyan:'${task.taskName}'} was not found.`;
