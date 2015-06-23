function processThis(deferred, previous, ctx) {
    deferred.resolve({message: 'task 1 completed', ctx: ctx});
}

module.exports.tasks = [processThis];