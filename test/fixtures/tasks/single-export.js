module.exports = function (obs, opts, ctx) {
    obs.log.info('HERE', opts);
    obs.onNext('Sup bro');
    obs.done();
};
