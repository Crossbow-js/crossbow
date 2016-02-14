function simple (opts, ctx, obs) {
    setTimeout(function () {
        obs.onNext('simple 1');
        obs.done();
    }, 10);
}

module.exports.tasks = [simple];
