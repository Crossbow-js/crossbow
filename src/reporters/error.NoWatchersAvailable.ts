import {NoWatchersAvailableError} from "../task.utils";

module.exports = (error: NoWatchersAvailableError) => {
    return `{red:-} {bold:Description}: You don't have any watchers
  defined anywhere in your configuration`;
};
