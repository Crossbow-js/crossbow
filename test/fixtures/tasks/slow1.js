function slow1 (obs, opts, ctx) {
    //console.log('Starting slow 1');
    //console.log('Watcher id', ctx.trigger.watcherUID);
    //console.log('Watcher trigger count', ctx.trigger._id);
    setTimeout(x => {
        //console.log('Finished slow 1');
        obs.done();
    }, 500);
}
module.exports = slow1;
