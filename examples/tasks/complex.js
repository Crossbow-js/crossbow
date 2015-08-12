function complex (deferred, previous, ctx) {
    deferred.notify({level: 'debug', msg: ['Complex', 'done']});
    deferred.resolve();
}

module.exports.tasks = [complex];