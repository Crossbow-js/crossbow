var exists  = require('fs').existsSync;
var resolve = require('path').resolve;
var logger  = require('./logger');

module.exports = function (crossbow, opts) {
    var bs = require('browser-sync').create();

    var watchConfig = {
        ignoreInitial: true
    };

    var config = getBsConfig(crossbow, opts);

    config.logPrefix = function () {
        return this.compile(logger.prefix);
    };

    logger.debug('Setting Browsersync config %s', config);

    return bs;
};

function getBsConfig (crossbow, opts) {

    var bsConfig = {
        server: './public'
    };
    var confexists = [
        crossbow.watch['bs-config'],
        'bs-config.js'
    ].some(function (file) {
            if (!file) {
                return;
            }
            if (typeof file === 'string') {
                var filepath = resolve(opts.cwd, file);
                if (exists(filepath)) {
                    logger.debug('Using Browsersync config from {yellow:%', filepath);
                    bsConfig = require(filepath);
                    return true;
                }
            } else {
                if (Object.keys(file).length) {
                    bsConfig = file;
                    return true;
                }
            }
        });
    return bsConfig;
}

module.exports.getBsConfig = getBsConfig;