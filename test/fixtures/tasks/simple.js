function simple (obs, opts, ctx) {

    //obs.log.info('{blue:+} Running simple 1');
    setTimeout(function () {
        //obs.log.info('DONE 1')
        obs.done();
    }, 10);
}

module.exports.tasks = [simple];