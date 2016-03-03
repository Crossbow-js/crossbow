import {Task} from "../task.resolve";
import {FlagNotProvidedError} from "../task.errors";

module.exports = (task: Task, error: FlagNotProvidedError) =>

`{red:-} {bold:Description}: {cyan:'${task.rawInput}'} is missing a valid flag (such as {yellow:'p'})
  Should be something like: {cyan:'${task.taskName}@p'}`;
