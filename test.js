module.exports = function (obs, opts, ctx) {
    if (ctx.trigger.type === 'watcher') {
        console.log(ctx.trigger._id);
    }
    obs.done();
}
