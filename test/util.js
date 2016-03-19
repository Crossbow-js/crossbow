const Rx     = require('rx');
const assert = require('assert');
const O      = Rx.Observable;
const create = O.create;

module.exports.errorTask = function (name, time, scheduler, error) {
    return create(observer => {
        observer.onNext({type: 'start', name});
        const sub = O.timer(time, scheduler || null)
            .subscribe(x => {
            }, function () {
            }, function () {
                observer.onNext({type: 'error', name, error});
                observer.onError(new Error('Some error'));
            });
        return () => {
            sub.dispose();
        };
    });
};

module.exports.task = function task(name, time, scheduler) {
    return create(observer => {
        observer.onNext({type: 'start', name});
        const sub = O.timer(time, scheduler || null)
            .subscribe(x => {
                // observer.onNext({type: 'value', name});
            }, function () {

            }, function () {
                observer.onNext({type: 'end', name});
                observer.onCompleted();
            });
        return () => {
            sub.dispose();
        };
    });
}
