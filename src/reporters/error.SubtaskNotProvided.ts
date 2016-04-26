import {Task} from "../task.resolve.d";
import {SubtaskNotProvidedError} from "../task.errors.d";

module.exports = (error: SubtaskNotProvidedError, task: Task) =>

    `{red:-} {bold:Description}: Colon used after task, but config key missing.
  When you provide a task name, followed by a {cyan::} (colon)
  Crossbow expects the next bit to have a key name that matches
  something in your config, eg: {cyan:${task.taskName}}:{yellow:dev}`;
