module.exports.tasks = [
    function (obs, opts, ctx) {
        var deferred = require('q').defer();

        setTimeout(function () {
            obs.log.info('Promise task 1');
            deferred.resolve('Done!');
        }, 100);

        return deferred.promise;
    },
    function (obs, opts, ctx) {
        var deferred = require('q').defer();

        setTimeout(function () {
            obs.log.info('Promise task 2');
            deferred.resolve('Done!');
        }, 100);

        return deferred.promise;
    },
    function (obs, opts, ctx) {
        var deferred = require('q').defer();

        setTimeout(function () {
            obs.log.info('Promise task 3');
            deferred.resolve('Done!');
        }, 100);

        return deferred.promise;
    }
]