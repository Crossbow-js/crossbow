function complex (obs) {
    setTimeout(function () {
        obs.log.info('All done, bro');
    }, 20)
}

module.exports.tasks = [complex];