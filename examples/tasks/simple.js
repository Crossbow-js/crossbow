function simple (obs) {
    obs.log.info('{blue:+} Running...');
    obs.onError(new Error('wewe'));
    setTimeout(function () {
        obs.log.info('{ok: } Completed');
        obs.onCompleted();
    }, 2000);
}

module.exports.tasks = [simple];