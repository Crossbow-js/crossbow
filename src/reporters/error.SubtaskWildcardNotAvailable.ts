import {Task} from "../task.resolve.d";
import {SubtaskWildcardNotAvailableError} from "../task.errors.d";

module.exports = (error: SubtaskWildcardNotAvailableError, task: Task) =>

    `{red:-} {bold:Description}: Configuration not provided for this task!'
  Because you dont have any configuration matching this task name
  it means you cannot use {cyan:${task.rawInput.split(' ')[0]}} syntax`;
