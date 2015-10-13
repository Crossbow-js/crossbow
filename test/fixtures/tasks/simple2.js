function simple2 (obs) {
    //obs.log.info('{blue:+} Running simple 2');
    setTimeout(function () {
        //obs.log.info('{ok: } Completed');
        obs.onCompleted();
    }, 10);
}

module.exports.tasks = [simple2];