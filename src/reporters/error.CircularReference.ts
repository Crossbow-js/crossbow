import {CircularReferenceError} from "../task.errors.d";

module.exports = (error: CircularReferenceError) => {
    return `{red:-} {bold:Description}: Circular Reference detected!
  The way your tasks are called will cause an infinite loop.
  {cyan:${error.parents[0]}} -> {yellow:${error.incoming.baseTaskName}} -> {red.bold:${error.parents[0]}}`
};
