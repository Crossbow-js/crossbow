import {SubtasksNotInConfigError} from "../task.errors";
import {Task} from "../task.resolve";

module.exports = (task: Task, error: SubtasksNotInConfigError) =>

`{red:-} {bold:Description}: Configuration not provided for this task!
  Your tried to run {cyan:'${task.rawInput}'}, but it won't work because
  when you use the {cyan:<task>}:{yellow:<sub-task>} syntax, Crossbow looks in your
  configuration for a key that matches the {yellow:sub-task} name.
  In this case you would need {cyan:${task.taskName}.${error.name}}`;
