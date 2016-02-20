module.exports = function (opts, ctx, observer) {
    //if (ctx.trigger.type === 'watcher') {
    //    console.log(ctx.trigger._id);
    //}
    setTimeout(function () {
        observer.done();
    }, 500);
};
