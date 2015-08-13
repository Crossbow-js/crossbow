function complex (obs) {
    setTimeout(function () {
        obs.log.info('All done, bro');
        obs.onCompleted();
    }, 0)
}

module.exports.tasks = [complex];