import {Task} from "../task.resolve.d";
import {AdaptorNotFoundError} from "../task.errors";

module.exports = (task: Task, error: AdaptorNotFoundError) =>

`{red:-} {bold:Description}: {cyan:'${task.adaptor}'} Not supported.`;
