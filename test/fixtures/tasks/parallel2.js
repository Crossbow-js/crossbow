module.exports = function (opts, context, obs) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve('done 2');
        }, 150);
    });
};
