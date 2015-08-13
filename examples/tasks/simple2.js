function simple2 (obs) {
    obs.log.info('{blue:+} Running...');
    setTimeout(function () {
        obs.log.info('{ok: } Completed');
        obs.onCompleted();
    }, 20);
}

module.exports.tasks = [simple2];