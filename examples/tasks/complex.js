function complex (obs) {
    setTimeout(function () {
        obs.onNext('Some value');
        obs.onCompleted();
    }, 0);
}

module.exports.tasks = [complex];