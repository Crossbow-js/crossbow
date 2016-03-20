var RxNode = require('rx-node');
var Rx = require('rx');

const types = {
    observable: {
        predicate (input) {
            return Rx.Observable.isObservable(input);
        },
        handle: handleObs
    },
    promise: {
        predicate (input) {
            return typeof input.then === 'function';
        },
        handle: handlePromise
    },
    nodeStream: {
        predicate (input) {
            return typeof input.pipe === 'function';
        },
        handle: handleNodeStream
    },
    eventEmitter: {
        predicate (input) {
            return typeof input.addListener === 'function';
        },
        handle: handleEventEmitter
    }
};

interface Observer {
    onNext: () => void
    onCompleted: () => void
    onError: () => void
}

export default function handleReturnType(output, obs: Observer) {

    var match = Object.keys(types).filter(x => {
        return types[x].predicate.call(null, output);
    })[0];

    if (match && typeof types[match].handle === 'function') {
        return types[match].handle.apply(null, [output, obs]);
    }
};

function handleNodeStream(output, obs) {
    return RxNode.fromStream(output, 'end')
        .subscribe(function (val) {
            obs.onNext(val);
        }, function (err) {
            obs.onError(err);
        }, function () {
            obs.done();
        });
}

function handlePromise(output, obs) {
    return Rx.Observable
        .fromPromise(output)
        .subscribe((val) => {
            obs.onNext(val);
        }, e => {
            obs.onError(e);
        }, () => {
            obs.done();
        });
}

function handleObs (output, obs) {
    return output
        .subscribe(val => {
            obs.onNext(val);
        }, e => {
            obs.onError(e);
        }, () => {
            obs.done();
        });
}

function handleEventEmitter (output, obs) {
    const o = Rx.Observable
        .fromEvent(output)
        .subscribe();

    o.onError(x => obs.onError(x));
    o.onCompleted(x => obs.done());
}
