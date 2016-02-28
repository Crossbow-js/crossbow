function simple2 (_, _2, obs) {
    //obs.log.info('{blue:+} Running simple 2');
    setTimeout(function () {
        //obs.log.info('{ok: } Completed');
        obs.done();
    }, 50);
}

module.exports.tasks = [simple2];
