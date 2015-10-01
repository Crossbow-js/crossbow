function simple (obs, opts) {

    //console.log('-----');
    //console.log(opts);
    //
    obs.log.info('{blue:+} Running simple 1');
    setTimeout(function () {
        //obs.log.info('{ok: } Completed');
        obs.done();
    }, 1000);
}

module.exports.tasks = [simple];