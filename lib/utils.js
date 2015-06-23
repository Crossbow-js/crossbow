var objPath  = require('object-path');
var exists   = require('fs').existsSync;
var resolve  = require('path').resolve;
var logger   = require('./logger');
var utils    = exports;

utils.arrarifyObj = function (obj) {
    return Object.keys(obj).reduce(function (newobj, key) {
        newobj[key] = utils.arrarify(obj[key]);
        return newobj;
    }, {});
};

utils.arrarify = function (item) {
    if (Array.isArray(item)) {
        return item;
    }
    return [item];
};

/**
 * Allow config lookup via
 *  eg: 'config:something.this'
 * @param key
 * @param crossbow
 * @returns {*}
 */
utils.getKey = function (key, crossbow) {

    var match = key.match(/^(.+?):(.+)/);

    if (!match) {
        return key;
    }

    var lookup = match[1].concat('.', match[2]);

    var item = objPath.get(crossbow, lookup);

    if (!item) {
        throw new TypeError('Could not find ' + lookup);
    }

    return item;

};

/**
 * @param {Object} crossbow
 * @param {Object} opts
 * @returns {{server: string}}
 */
utils.getBsConfig = function (crossbow, opts) {

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
};