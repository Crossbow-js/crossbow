function simple2 (_, _2, done) {
    //obs.log.info('{blue:+} Running simple 2');
    setTimeout(function () {
        //obs.log.info('{ok: } Completed');
        done();
    }, 50);
}

module.exports.tasks = [simple2];
