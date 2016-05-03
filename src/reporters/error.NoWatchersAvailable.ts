import {NoWatchersAvailableError} from "../task.utils";

module.exports = (error: NoWatchersAvailableError) => {
    return `{red:-} {bold:Description}: You didn't provide a watcher-name to run
  and interactive run mode is also not available as there are no watchers defined`;
};
