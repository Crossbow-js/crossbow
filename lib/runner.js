const basename = require('path').basename;
const Rx       = require('rx');
const logger   = require('./logger');

module.exports = function (cliInput, ctx, tasks, sequence) {

    /**
     * Unravel each sequence item, picking out every single FN
     * needed and queue them up
     */
    const seq = sequence.reduce(function (all, seqItem) {

        /**
         * A 'taskItem' is a function within a file,
         * or the function exposed from a compate layer.
         * That's why there can be mulitple and we need to
         * queue them all up
         */
        return all.concat(seqItem.seq.taskItems.map(function (item) {

            /**
             * Create an Observable from scratch to represent
             * the lifecycle of this single function
             */
            return Rx.Observable.create(obs => {

                obs = decorateObserver(obs, seqItem);

                item.startTime = new Date().getTime();

                process.nextTick(function () {
                    const output = item.FUNCTION.call(null, obs, seqItem.opts, ctx);
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
            })
                /**
                 * Decorate any errors that occur with task information
                 */
                .catch(e => decorateErrors(e, seqItem))
                /**
                 * Attach the current seqItem to any values
                 * emitted from tasks
                 */
                .map(value => {
                    return {from: seqItem, value};
                })
                .share();
        }));
    }, []);

    return {
        seq,
        tasks,
        sequence,
        /**
         * Run every task in the exact order given
         */
        series:   () => Rx.Observable.from(seq).concatAll(),
        /**
         * Run the tasks as quickly as possible
         */
        parallel: () => Rx.Observable.merge(seq),
        /**
         * alias for .series
         */
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

/**
 * Put a big banner around error messgaes to make it clear
 * which task they originate from
 * @param {Error} e
 * @param {object} seqItem
 * @returns {Observable}
 */
function decorateErrors (e, seqItem) {
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
}

/**
 * Add extra properties/logging to the observer that is passed
 * into each function
 * @param {object} obs
 * @param {object} seqItem
 * @returns {object}
 */
function decorateObserver (obs, seqItem) {
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

    return obs;
}
