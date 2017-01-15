import {InvalidTaskInputError} from "../task.errors";

module.exports = (error: InvalidTaskInputError) => {
    return `{red:-} {bold:Description}: Invalid Object Literal given as task.
  When you provide an object literal as a task, it requires either an {yellow:'input'} key or both {yellow:'adaptor'} & {yellow:'command'} keys. eg:
  
  {bold:task}: {
    {bold:input}: {yellow:'@npm webpack -w'}
  \\}
  
  or
  
  {bold:adaptor}: {yellow:'npm'},
  {bold:command}: {yellow:'webpack -w'}
  `;
};
