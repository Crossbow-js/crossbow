const defaults = {
    cwd: process.cwd(),
    runMode: 'sequence',
    resumeOnError: false,
    summary: 'short',
    strict: false
};

module.exports.merge = function (opts) {
    return require('immutable').fromJS(defaults).mergeDeep(opts);
};
