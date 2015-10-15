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

    var seq = sequence.reduce(function (all, seq) {

        return all.concat(seq.fns.map(function (fn) {

            return Rx.Observable.create(obs => {
                obs.log = logger.clone(x => {
                    x.prefix = '{gray: ' + getLogPrefix(basename(seq.task.taskName), 13) + ' :: ';
                    return x;
                });

                obs.compile = logger.compile;
                obs.done    = obs.onCompleted.bind(obs);
                var output  = fn.call(obs, obs, seq.opts, ctx);

                if (output && typeof output.distinctUntilChanged === 'function') {
                    return output.do(function (x) {
                        obs.onNext(x);
                    }).subscribe(x => {}, e => obs.onError(e), x => obs.onCompleted());
                }

                if (output && typeof output.then === 'function') {
                    return Rx.Observable
                        .fromPromise(output)
                        .subscribe(x => {
                            obs.onCompleted(x);
                        }, e => {
                            obs.onError(e);
                        });
                }

                if (output && typeof output.pipe === 'function') {
                    RxNode.fromStream(output, 'end')
                        .subscribe(function (val) {
                            obs.onNext(val);
                        }, function (err) {
                            obs.onError(err);
                        }, function () {
                            obs.onCompleted();
                        });
                }
            }).catch(e => {
                var lineLength = new Array(seq.task.taskName.length).join('-');
                logger.error('{gray:-----------------------------' + lineLength);
                logger.error('{red:following ERROR from task {cyan:`%s`}', seq.task.taskName);
                logger.error('{gray:-----------------------------' + lineLength);
                e.task = seq.task;
                return Rx.Observable.throw(e);
            });
        }));
    }, []);

    return {
        run: Rx.Observable.from(seq).concatAll(),
        tasks: tasks,
        sequence: sequence
    }
}

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