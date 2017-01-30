import {Task} from "../task.resolve";
import {TaskNotFoundError} from "../task.errors";

module.exports = (error: TaskNotFoundError, task: Task) => {

    return `{red:-} {bold:Description}: {cyan:'${task.taskName}'} was not found.
{red:-} {bold:Working Dir}: {cyan:'${error.cwd}'}.

  Perhaps you meant one of the following instead?
  {cyan.bold:${error.possible.join(' ')}}
`
};
