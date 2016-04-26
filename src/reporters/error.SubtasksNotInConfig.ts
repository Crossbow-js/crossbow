import {SubtasksNotInConfigError} from "../task.errors.d";
import {Task} from "../task.resolve.d";

module.exports = (error: SubtasksNotInConfigError, task: Task) => {
    return `{red:-} {bold:Description}: Configuration not provided for this task!
  Your tried to run {cyan:'${task.rawInput}'}, but it won't work because
  when you use the {cyan:<task>}:{yellow:<sub-task>} syntax, Crossbow looks in your
  configuration for a key that matches the {yellow:sub-task} name.
  In this case you would need {cyan:${task.taskName} {white:->} ${error.name}}`;
};
