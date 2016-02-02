function simple (obs) {
    //obs.log.info('{blue:+} Error Running...');
    setTimeout(function () {
        //obs.onError(new Error('Shit went wrong again'));
        obs.done();
    }, 100);
}

module.exports = simple;
