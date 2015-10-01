function simple (obs, opts, ctx) {

    //console.log('-----');
    //console.log(opts);

    obs.log.info('{blue:+} Running simple 1');

    setTimeout(function () {
        obs.done();
    }, 500);


    setTimeout(function () {
        //obs.log.info('{ok: } Completed');
        obs.done();
    }, 2000);
}

module.exports.tasks = [simple];