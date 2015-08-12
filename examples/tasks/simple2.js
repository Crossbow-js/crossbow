function simple2 (deferred, previous, ctx) {
    deferred.notify({level: 'debug', msg: ['Simple 2 done']});
    deferred.resolve();
}

module.exports.tasks = [simple2];