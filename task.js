function processThis(deferred, previous, ctx) {
    deferred.resolve({status: 'task 1 completed', ctx: ctx});
}

module.exports.tasks = [processThis];