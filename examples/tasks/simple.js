function simple (obs) {
    obs.log.info('{blue:+} Running...');
    setTimeout(function () {
        obs.log.info('{ok: } Completed');
        obs.onCompleted();
    }, 100);
}

module.exports.tasks = [simple];