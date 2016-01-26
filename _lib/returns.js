var r = exports;
var RxNode = require('rx-node');
var Rx = require('rx');

r.types = {
    "observable": {
        predicate: function predicate(input) {
            return typeof input.distinctUntilChanged === 'function';
        },
        handle: handleObs
    },
    promise: {
        predicate: function predicate(input) {
            return typeof input.then === 'function';
        },
        handle: handlePromise
    },
    nodeStream: {
        predicate: function predicate(input) {
            return typeof input.pipe === 'function';
        },
        handle: handleNodeStream
    }
};

r.handleReturnType = function (output, obs) {
    var match = Object.keys(r.types).filter(function (x) {
        return r.types[x].predicate.call(null, output);
    })[0];

    if (match && typeof r.types[match].handle === 'function') {
        return r.types[match].handle.apply(null, [output, obs]);
    }
};

function handleNodeStream(output, obs) {
    return RxNode.fromStream(output, 'end').subscribe(function (val) {
        obs.onNext(val);
    }, function (err) {
        obs.onError(err);
    }, function () {
        obs.done();
    });
}

function handlePromise(output, obs) {
    return Rx.Observable.fromPromise(output).subscribe(function (x) {
        obs.done(x);
    }, function (e) {
        obs.onError(e);
    });
}

function handleObs(output, obs) {
    return output['do'](function (x) {
        obs.onNext(x);
    }).subscribe(function (x) {}, function (e) {
        return obs.onError(e);
    }, function (x) {
        return obs.done();
    });
}