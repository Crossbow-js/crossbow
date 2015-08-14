var logger = require('./logger');

module.exports = function (bsConfig, watchTasks, afterFn) {

    var bs          = require('browser-sync').create();
    var watchConfig = {ignoreInitial: true};

    bsConfig.files  = bsConfig.files || [];

    bsConfig.logPrefix = function () {
        return this.compile(logger.prefix);
    };

    bsConfig.logFileChanges = false;

    bsConfig.files = bsConfig.files.concat(watchTasks.map(function (task, i) {

        return {
            options: task.options || watchConfig,
            match: task.patterns,
            fn: afterFn.bind(bs, task, splitTasks(task.tasks))
        };
    }));

    bs.init(bsConfig, function (err, bs) {
        if (err) {
            throw err;
        }
    });

    var methods = {
        runPublicMethods: function (bsTasks) {
            if (!bsTasks.length) {
                return;
            }
            bsTasks.forEach(function (task) {
                if (typeof bs[task.method] === 'function') {
                    if (task.args.length) {
                        bs[task.method].apply(bs, task.args);
                    } else {
                        bs[task.method].call(bs);
                    }
                }
            });
        }
    };

    return methods;
};

/**
 * split [css, bs:reload] into
 *  {bsTasks: [], valid: []}
 * @param tasks
 * @returns {*|Observable|{bsTasks: Array, valid: Array}|Rx.Observable<T>|Rx.Observable<{bsTasks: Array, valid: Array}>}
 */
function splitTasks (tasks) {
    return tasks.reduce((all, item) => {
        if (item.match(/^bs:/)) {
            var split = item.split(':');
            all.bsTasks.push({method: split[1], args: split.slice(2)});
        } else {
            all.valid.push(item);
        }
        return all;
    }, {bsTasks: [], valid: []});
}