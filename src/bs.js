var logger = require('./logger');
var utils = require('./utils');

module.exports = function (bsConfig, taskStream$, crossbow) {

    var bs;

    if (!bsConfig) {
        return;
    }

    bsConfig.logFileChanges = false;
    bsConfig.logPrefix = function () {
        return this.compile(logger.prefix);
    };
    bs = require(bsConfig.bs || 'browser-sync').create('Crossbow');
    bs.init(bsConfig, function (err) {
        if (err) {
            throw err;
        }
    });

    /**
     * Handle any after-task Browsersync tasks
     */
    taskStream$.do(x => {
        if (!bs) {
            return;
        }
        x.tasks.bsTasks.forEach(function (task) {
            if (task.args.length) {
                task.args = utils.transformStrings(task.args, crossbow.config);
            }
            if (typeof bs[task.method] === 'function') {
                if (task.args.length) {
                    bs[task.method].apply(bs, task.args);
                } else {
                    bs[task.method].call(bs);
                }
            }
        });
    }).subscribe();

};

module.exports.splitTasks = splitTasks;

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
