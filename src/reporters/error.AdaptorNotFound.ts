import {Task} from "../task.resolve";
import {AdaptorNotFoundError} from "../task.errors";

module.exports = (error: AdaptorNotFoundError, task: Task) =>

    `{red:-} {bold:Description}: {cyan:'${task.adaptor}'} Not supported.`;
