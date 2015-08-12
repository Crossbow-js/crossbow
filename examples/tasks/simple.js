function simple (deferred, previous, ctx) {
    deferred.notify({level: 'debug', msg: ['Simple done']});
    deferred.resolve();
}

module.exports.tasks = [simple];