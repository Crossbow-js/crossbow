module.exports = function singleExport(opts, ctx, done) {
    obs.onNext('Sup bro');
    done();
};
