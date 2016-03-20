function simple (opts, ctx, obs) {
    setTimeout(function () {
        obs.done();
    }, 10);
}

module.exports.tasks = [simple];
