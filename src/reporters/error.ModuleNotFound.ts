import {Task} from "../task.resolve.d";
import {ModuleNotFoundError} from "../task.errors.d";

module.exports = (error: ModuleNotFoundError, task: Task) =>

    `{red:-} {bold:Description}: {cyan:'${task.taskName}'} was not found.`;
