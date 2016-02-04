var Rx = require('rx');

module.exports = function (taskResolver, tasks, ctx) {

    const beforeTasks = Object.keys(tasks).reduce(function (all, item) {
        if (tasks[item].before) {
            return all.concat(tasks[item].before);
        }
        return all;
    }, []);

    if (beforeTasks.length) {
        return taskResolver.getRunner(beforeTasks, ctx).run;
    }

    return  Rx.Observable.empty();
};
