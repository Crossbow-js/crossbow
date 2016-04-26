import {NoTasksAvailableError} from "../task.utils";

module.exports = (error: NoTasksAvailableError) => {
    return `{red:-} {bold:Description}: You didn't provide a task-name to run
  and interactive run mode is also not available as there are no tasks defined`;
};
