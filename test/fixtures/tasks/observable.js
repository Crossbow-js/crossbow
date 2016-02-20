var Rx = require('rx');

module.exports.tasks = [
    function (opts, ctx, obs) {
        //obs.log.info('Observable task 1');
        return Rx.Observable.interval(5).take(5);
    },
    function (obs) {
        //obs.log.info('Observable task 2');
        return Rx.Observable.interval(5).take(5);
    }
]
