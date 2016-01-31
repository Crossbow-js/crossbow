function simple (obs, opts, ctx) {

    //obs.log.info('{blue:+} Running simple 1');
    setTimeout(function () {
        console.log('simple1 done');
        obs.done();
    }, 1000);
}

module.exports.tasks = [simple];
