function simple (opts, ctx, obs) {
    setTimeout(function () {
        obs.onNext('simple multi 1');
        obs.done();
    }, 10);
}

function simple2 (opts, ctx, obs) {
    setTimeout(function () {
        obs.onNext('simple multi 2');
        obs.done();
    }, 10);
}

module.exports.tasks = [simple, simple2];
