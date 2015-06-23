function processThis(deferred, previous, ctx) {
    console.log(ctx.path.make('sass.input'));
    deferred.resolve();
}

module.exports.tasks = [processThis];