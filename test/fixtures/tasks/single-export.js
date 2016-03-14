module.exports = function singleExport(opts, ctx, obs) {
    obs.onNext('Sup bro');
    obs.done();
};
