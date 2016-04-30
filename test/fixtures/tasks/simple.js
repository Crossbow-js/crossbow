function simple (opts, ctx, done) {
    setTimeout(function () {
        done();
    }, 10);
}

module.exports.tasks = [simple];
