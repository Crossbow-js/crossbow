const basename = require('path').basename;
const Rx       = require('rx');
const logger   = require('./logger');

module.exports = function (cliInput, ctx, tasks, sequence) {

    var seq = sequence.reduce(function (all, seqItem) {

        return all.concat(seqItem.seq.taskItems.map(function (item) {

            return Rx.Observable.create(obs => {

                item.startTime = new Date().getTime();

                obs.log = logger.clone(x => {
                    var base = basename(seqItem.task.taskName);
                    if (seqItem.task.compat) {
                        base = '$' + seqItem.task.compat;
                    }
                    x.prefix = '{gray: ' + getLogPrefix(base, 13) + ' :: ';
                    return x;
                });

                obs.compile = logger.compile;

                obs.done = function () {
                    obs.onCompleted();
                };

                process.nextTick(function () {
                    var output = item.FUNCTION.call(null, obs, seqItem.opts, ctx);
                    if (output !== undefined) {
                        require('./returns').handleReturnType(output, obs);
                    } else {
                        logger.debug('Make sure you call .done() in your function');
                    }
                });

                return function () {
                    item.completed = true;
                    item.endTime   = new Date().getTime();
                    item.duration  = item.endTime - item.startTime;
                };

            }).catch(e => {

                if (!e._cbDisplayed) {
                    var lineLength = new Array(seqItem.task.taskName.length).join('-');
                    logger.error('{gray:-----------------------------' + lineLength);
                    var taskname = seqItem.task.taskName;

                    if (seqItem.task.compat) {
                        taskname = `($${seqItem.task.compat}) ${taskname}`;
                    }
                    logger.error('{red:following ERROR from task {cyan:`%s`}', taskname);
                    logger.error('{gray:-----------------------------' + lineLength);
                }

                e.task = seqItem.task;
                return Rx.Observable.throw(e);
            }).share();
        }));
    }, []);

    return {
        seq,
        tasks,
        sequence,
        series:   () => Rx.Observable.from(seq).concatAll(),
        parallel: () => Rx.Observable.forkJoin(seq),
        run:      Rx.Observable.from(seq).concatAll(),
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
