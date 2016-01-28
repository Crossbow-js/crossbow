const arrarify    = require('./utils').arrarify;
const blacklist = ['options', 'bs-config', 'before'];

var getTaskFormat = function (watchTask) {

    if (Array.isArray(watchTask)) {
        return watchTask.reduce((all, item) => {
            return all.concat(getTaskFormat(item));
        }, []);
    }

    return Object.keys(watchTask).reduce((all, item) => {
        if (blacklist.indexOf(item) > -1) {
            all.before = all.before.concat(watchTask[item]);
        } else {
            all.items = all.items.concat({
                patterns: item.split(':'),
                tasks: arrarify(watchTask[item])
            });
        }
        return all;
    }, {before: [], items: []});
};

/**
 * Gather tasks and flatten config
 * @returns {Array}
 * @param input
 */
module.exports = function (input) {

    var watch      = input.watch;
    var watchTasks = watch.tasks;

    var out = Object.keys(watchTasks).reduce((all, key )=> {
        all[key] = getTaskFormat(watchTasks[key]);
        return all;
    }, {});

    return out;
};
