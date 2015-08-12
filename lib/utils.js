var objPath = require('object-path');
var exists = require('fs').existsSync;
var resolve = require('path').resolve;
var extname = require('path').extname;
var basename = require('path').basename;
var logger = require('./logger');
var utils = exports;
var fs = require('fs');
var Rx = require('rx');
var yml = require('js-yaml');

/**
 * @param {Error|TypeError} [err]
 */
utils.defaultCallback = function (err) {
    if (err) {
        throw err;
    }
};

/**
 * Wrap each item of an object in an array
 * @param {Object} obj
 * @returns {Object}
 */
utils.arrarifyObj = function (obj) {
    return Object.keys(obj).reduce(function (newobj, key) {
        newobj[key] = utils.arrarify(obj[key]);
        return newobj;
    }, {});
};

/**
 * Wrap a non-array item in an array
 * @param {*} item
 * @returns {Array}
 */
utils.arrarify = function (item) {
    if (Array.isArray(item)) {
        return item;
    }
    return [item];
};

/**
 * Allow config lookup via
 *  eg: 'config:something.this'
 * @param {String} key
 * @param {Object} obj
 * @returns {*}
 */
utils.getKey = function (key, obj) {

    var match = key.match(/^(.+?):(.+)/);

    if (!match) {
        return key;
    }

    var lookup = match[1].concat('.', match[2]);

    var item = objPath.get(obj, lookup);

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

    var confexists = [crossbow.watch['bs-config'], 'bs-config.js'].some(function (file) {
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

/**
 * Try to auto-load configuration
 * @param flags
 * @param config
 * @returns {*}
 */
utils.retrieveConfig = function (flags, config) {

    var validExts = ['.js', '.json', '.yaml', '.yml'];
    var maybes = ['crossbow.js', 'crossbow.yaml', 'crossbow.yml', 'package.json'];
    var cwd = config.get('cwd');

    if (flags.config) {
        return filterFiles([flags.config]).map(importConfig);
    } else {
        var out = getFiles(filterFiles(maybes)[0]);
        return out;
    }

    function importConfig(filepath) {
        var ext = extname(filepath);
        if (validExts.indexOf(ext) > -1) {
            if (ext.match(/ya?ml$/)) {
                return yml.safeLoad(fs.readFileSync(filepath));
            }
            return require(filepath);
        }
        return {};
    }

    /**
     * Get a file
     * @param input
     * @returns {*}
     */
    function getFiles(input) {
        if (!Array.isArray(input)) {
            input = [input];
        }
        var out = input.map(function (x) {
            if (basename(x) === "crossbow.js") {
                return require(x);
            } else if (x.match(/yml|yaml$/)) {
                return yml.safeLoad(fs.readFileSync(x));
            } else {
                var mod = require(x);
                if (mod.crossbow) {
                    return mod.crossbow;
                }
            }
            return false;
        }).filter(function (x) {
            return x;
        });

        return out;
    }

    function filterFiles(input) {
        return input.map(function (x) {
            return resolve(cwd, x);
        }).filter(fs.existsSync);
    }
};

/**
 * @param arr
 * @returns {*}
 */
utils.getPresentableTaskList = function (arr) {
    return arr.map(function (item) {
        var split = item.split(' ');
        if (split.length === 3 && split[1] === 'as') {
            return split[2];
        }
        return item;
    });
};

/**
 * @param {String} cwd
 * @param {String} name
 * @returns {Array.<T>}
 */
utils.locateModule = function (cwd, name) {
    return [['tasks', name + '.js'], ['tasks', name], [name + '.js'], [name], ['node_modules', 'crossbow-' + name]].map(function (x) {
        return resolve.apply(null, [cwd].concat(x));
    }).filter(function (x) {
        return fs.existsSync(x);
    });
};