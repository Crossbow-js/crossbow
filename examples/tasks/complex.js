function complex (obs) {
    setTimeout(function () {
        obs.onNext('as');
        obs.onCompleted();
    }, 0);
}

module.exports.tasks = [complex];