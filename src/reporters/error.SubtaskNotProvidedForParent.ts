import {Task} from "../task.resolve";
import {SubtaskNotProvidedForParentError} from "../task.errors";

module.exports = (error: SubtaskNotProvidedForParentError, task: Task) => {
    return `{red:-} {bold:Description}: Colon used after parent task name, but child task name missing.
  
  When you provide a task name, followed by a {cyan::} (colon)
  Crossbow expects the next bit to have a key name that matches
  a child task. So, in your case, the following would be valid:

${error.available.map(x => `  {gray:$ crossbow} {yellow.bold:${error.name}:${x}`).join("\n")}
`;
};
