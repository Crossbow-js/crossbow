/**
 * Gather tasks and flatten config
 * @param {Array} cliInput
 * @returns {Array}
 */
module.exports = function (cliInput, watchTasks) {

    const watcherKeys = Object.keys(watchTasks);

    /**
     * If no named watchers were provided, assume
     * all items are to be watched
     */
    if (!cliInput.length) {
        return watchTasks;
    }

    /**
     * Look at the name of each watchtask.
     * If the name matches an argument given on
     * the command line, add that item to a new
     * object under the same key
     */
    return watcherKeys
        .filter(x => cliInput.indexOf(x) > -1)
        .reduce((all, item) => {
            if (!all[item]) {
                all[item] = watchTasks[item];
            }
            return all;
        }, {});
};

module.exports.resolveBeforeTasks = function (input, watchTasks) {
	//console.log(input);
	//console.log(watchTasks);
    return Object.keys(watchTasks)
        .reduce((all, item) => {
            return all.concat([].concat(watchTasks[item].before).filter(Boolean));
        }, [])
        .concat(input.watch.before)
        .filter(Boolean);
};
