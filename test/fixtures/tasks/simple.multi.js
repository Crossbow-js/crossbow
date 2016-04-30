function simple (opts, ctx, done) {
    setTimeout(function () {
        done();
    }, 10);
}

function simple2 (opts, ctx, done) {
    setTimeout(function () {
        done();
    }, 10);
}

module.exports.tasks = [simple, simple2];
