var defaults = {
    cwd: process.cwd(),
    runMode: 'sequence',
    resumeOnError: false,
    summary: 'short',
    strict: true
};

module.exports.merge = function (opts) {
	return require('immutable').fromJS(defaults).mergeDeep(opts);
}