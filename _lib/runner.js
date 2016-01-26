var utils = require('./utils');
var basename = require('path').basename;
var objPath = require('object-path');
var Rx = require('rx');
var RxNode = require('rx-node');
var logger = require('./logger');
var gruntCompat = require('./grunt-compat');
var compat = require('./compat');
var t = require('./task-resolve');

module.exports = function (cliInput, ctx, tasks, sequence) {

    var seq = sequence.reduce(function (all, seqItem) {

        return all.concat(seqItem.seq.taskItems.map(function (item) {

            return Rx.Observable.create(function (obs) {

                item.startTime = new Date().getTime();

                obs.log = logger.clone(function (x) {
                    x.prefix = '{gray: ' + getLogPrefix(basename(seqItem.task.taskName), 13) + ' :: ';
                    return x;
                });

                obs.compile = logger.compile;
                obs.done = function () {
                    obs.onCompleted(obs);
                };

                var output = item.FUNCTION.call(obs, obs, seqItem.opts, ctx);

                if (output) {
                    require('./returns').handleReturnType(output, obs);
                }
                return function () {
                    item.completed = true;
                    item.endTime = new Date().getTime();
                    item.duration = item.endTime - item.startTime;
                };
            })['catch'](function (e) {
                var lineLength = new Array(seqItem.task.taskName.length).join('-');
                logger.error('{gray:-----------------------------' + lineLength);
                logger.error('{red:following ERROR from task {cyan:`%s`}', seqItem.task.taskName);
                logger.error('{gray:-----------------------------' + lineLength);
                e.task = seqItem.task;
                return Rx.Observable['throw'](e);
            });
        }));
    }, []);

    //console.log(seq);
    return {
        run: Rx.Observable.from(seq).concatAll(),
        tasks: tasks,
        sequence: sequence
    };
};

/**
 * Get a customised prefixed logger per task
 * @param {String} name
 * @param {Number} maxLength
 * @returns {string}
 */
function getLogPrefix(name, maxLength) {
    var diff = maxLength - name.length;
    if (diff > 0) {
        return new Array(diff + 1).join(' ') + name;
    }
    return name.slice(0, maxLength - 1) + '~';
}