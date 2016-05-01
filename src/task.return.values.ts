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
            return typeof input.on === 'function';
        },
        handle: handleNodeStream
    }
};

interface Observer {
    onNext: () => void
    onCompleted: () => void
    onError: () => void
}

export default function handleReturnType(output, cb: ()=>void) {

    var match = Object.keys(types).filter(x => {
        return types[x].predicate.call(null, output);
    })[0];

    if (match && typeof types[match].handle === 'function') {
        return types[match].handle.apply(null, [output, cb]);
    }
};

function handleNodeStream(output, done) {
    return RxNode.fromStream(output, 'end')
        .subscribe(function (val) {
        }, function (err) {
            done(err);
        }, function () {
            done();
        });
}

function handlePromise(output, done) {
    return Rx.Observable
        .fromPromise(output)
        .subscribe((val) => {
        }, err => {
            done(err);
        }, () => {
            done();
        });
}

function handleObs(output, done) {
    return output
        .subscribe(val => {
        }, e => {
            done(e);
        }, () => {
            done();
        });
}
