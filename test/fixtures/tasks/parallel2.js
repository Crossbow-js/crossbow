module.exports = function (obs) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            obs.log.info('done 2');
            resolve('done 2');
        }, 150);
    });
};
