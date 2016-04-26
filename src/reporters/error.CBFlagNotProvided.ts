import {Task} from "../task.resolve.d";
import {CBFlagNotProvidedError} from "../task.errors.d";

module.exports = (error: CBFlagNotProvidedError, task: Task) =>

    `{red:-} {bold:Description}: {cyan:'${task.rawInput}'} is missing a valid flag (such as {yellow:'p'})
  Should be something like: {cyan:'${task.taskName}@p'}`;
