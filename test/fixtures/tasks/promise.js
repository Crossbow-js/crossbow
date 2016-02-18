module.exports.tasks = [
    function () {
        var deferred = require('q').defer();

        setTimeout(function () {
            deferred.resolve('Done!');
        }, 100);

        return deferred.promise;
    },
    function () {
        var deferred = require('q').defer();

        setTimeout(function () {
            deferred.resolve('Done!');
        }, 100);

        return deferred.promise;
    },
    function () {
        var deferred = require('q').defer();

        setTimeout(function () {
            deferred.resolve('Done!');
        }, 100);

        return deferred.promise;
    }
]