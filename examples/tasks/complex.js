function complex (obs) {
    setTimeout(function () {
        obs.onNext();
        obs.onCompleted();
    }, 0)
}

module.exports.tasks = [complex];