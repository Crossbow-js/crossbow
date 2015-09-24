function simple (obs, opts) {

    //console.log('-----');
    //console.log(opts);
    //
    //obs.log.info('{blue:+} Running...');
    setTimeout(function () {
        //obs.log.info('{ok: } Completed');
        obs.onCompleted();
    }, 10);
}

module.exports.tasks = [simple];