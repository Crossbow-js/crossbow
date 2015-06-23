function processThis(deferred, previous, ctx) {
    deferred.notify({level: 'info', msg: 'Running task 1'});
    deferred.resolve({message: 'task 1 completed', ctx: ctx});
}

module.exports.tasks = [processThis];