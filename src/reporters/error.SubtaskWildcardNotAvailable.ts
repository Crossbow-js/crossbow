import {Task} from "../task.resolve";
import {SubtaskWildcardNotAvailableError} from "../task.errors";

module.exports = (error: SubtaskWildcardNotAvailableError, task: Task) =>

    `{red:-} {bold:Description}: Configuration not provided for this task!
  Because you dont have any configuration matching this task name
  it means you cannot use {cyan:${task.rawInput.split(" ")[0]}} syntax`;
