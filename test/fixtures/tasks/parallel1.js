module.exports = function () {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve('done 1');
        }, 200);
    });
};
