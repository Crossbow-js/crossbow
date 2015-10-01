function complex (obs) {
    obs.log.info('{blue:+} Running complex');
    setTimeout(function () {
        obs.onCompleted();
    }, 1000);
}

module.exports.tasks = [complex];