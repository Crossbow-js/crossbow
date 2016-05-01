function simple (opts, ctx, done) {
    //obs.log.info('{blue:+} Error Running...');
    setTimeout(function () {
        done(new Error('Shit went wrong again'));
        //obs.done();
    }, 100);
}

module.exports = simple;
