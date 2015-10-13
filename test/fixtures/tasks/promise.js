module.exports.tasks = [
    function (obs, opts, ctx) {
        var deferred = require('q').defer();

        setTimeout(function () {
            obs.log.info('DONE Promise');
            deferred.resolve('Done!');
        }, 1000);

        return deferred.promise;
    }
]