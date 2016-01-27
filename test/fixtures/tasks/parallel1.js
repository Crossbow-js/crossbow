module.exports = function (obs) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            obs.log.info('done 1');
            resolve('done 1');
        }, 200);
    });
};
