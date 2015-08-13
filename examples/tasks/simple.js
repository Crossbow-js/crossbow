function simple (obs) {
    obs.log.info('{blue:+} Running...');
    setTimeout(function () {
        obs.log.info('{ok: } Completed');
        obs.onCompleted();
    }, 0);
}

module.exports.tasks = [simple];