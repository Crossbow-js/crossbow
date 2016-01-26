var Rx = require('rx');
module.exports = function (taskResolver, tasks, ctx) {
    var beforeTasks = Object.keys(tasks).reduce(function (all, item) {
        if (tasks[item].before) {
            return all.concat(tasks[item].before);
        }
        return all;
    }, []);

    var beforeRunner;
    if (beforeTasks.length) {
        beforeRunner = taskResolver.getRunner(beforeTasks, ctx).run;
    } else {
        beforeRunner = Rx.Observable.empty();
    }

    return beforeRunner;
};
