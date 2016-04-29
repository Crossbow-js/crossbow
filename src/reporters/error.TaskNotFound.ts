import {Task} from "../task.resolve.d";
import {TaskNotFoundError} from "../task.errors.d";

module.exports = (error: TaskNotFoundError, task: Task) =>

    `{red:-} {bold:Description}: {cyan:'${task.taskName}'} was not found.`;
