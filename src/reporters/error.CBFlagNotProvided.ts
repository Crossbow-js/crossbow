import {Task} from "../task.resolve";
import {CBFlagNotProvidedError} from "../task.errors";

module.exports = (error: CBFlagNotProvidedError, task: Task) =>

    `{red:-} {bold:Description}: {cyan:'${task.rawInput}'} is missing a valid flag (such as {yellow:'p'})
  Should be something like: {cyan:'${task.taskName}@p'}`;
