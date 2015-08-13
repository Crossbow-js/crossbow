function complex (obs) {
    setTimeout(function () {
        obs.log.info('All done, bro');
        obs.onCompleted();
    }, 20)
}

module.exports.tasks = [complex];