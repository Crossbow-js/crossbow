function complex (obs) {
    setTimeout(function () {
        obs.onNext();
        obs.onCompleted();
    }, 20)
}

module.exports.tasks = [complex];