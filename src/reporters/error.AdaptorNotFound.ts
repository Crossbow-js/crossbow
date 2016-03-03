import {Task} from "../task.resolve";
import {AdaptorNotFoundError} from "../task.errors";

module.exports = (task: Task, error: AdaptorNotFoundError) =>

`{red:-} {bold:Description}: {cyan:'${task.adaptor}'} Not supported.`;
