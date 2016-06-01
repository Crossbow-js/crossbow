import {Task} from "../task.resolve.d";
import {TaskNotFoundError} from "../task.errors.d";

module.exports = (error: TaskNotFoundError, task: Task) =>
    `{red:-} {bold:Description}: {cyan:'${task.taskName}'} was not found.
{red:-} {bold:Working Dir}: {cyan:'${error.cwd}'}.

  To see a list of your available tasks, run either of the following:
  
  {cyan:$} \{cyan.bold:crossbow tasks}
  {cyan:$} \{cyan.bold:crossbow run -i}
  `;
