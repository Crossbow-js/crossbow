var Rx = require('rx');

module.exports.tasks = [
    function (obs) {
        obs.log.info('Observable task 1');
        return Rx.Observable.interval(50).take(5);
    },
    function (obs) {
        obs.log.info('Observable task 2');
        return Rx.Observable.interval(50).take(5);
    }
]