import {Task} from "../task.resolve.d";
import {AdaptorNotFoundError} from "../task.errors.d";

module.exports = (error: AdaptorNotFoundError, task: Task) =>

    `{red:-} {bold:Description}: {cyan:'${task.adaptor}'} Not supported.`;
