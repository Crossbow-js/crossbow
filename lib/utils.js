const objPath  = require('object-path');
const resolve  = require('path').resolve;
const extname  = require('path').extname;
const basename = require('path').basename;
const fs       = require('fs');
const utils    = exports;
const yml      = require('js-yaml');
const traverse = require('traverse');

utils.padCrossbowError = function (msg) {
    return msg.split('\n').map(function (item) {
        return '       ' + item;
    }).join('\n');
};

/**
 * @param {Error|TypeError} [err]
 */
utils.defaultCallback = function (err) {
    if (err) {
        if (err.crossbowMessage) {
            console.log(utils.padCrossbowError(err.crossbowMessage));
        } else {
            if (err.stack) {
                console.log(err.stack);
            } else {
                console.log(err);
            }
        }
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

    const match = key.match(/^(.+?):(.+)/);

    if (!match) {
        return key;
    }

    const lookup = match[1].concat('.', match[2]);

    const item = objPath.get(obj, lookup);

    if (!item) {
        throw new TypeError('Could not find ' + lookup);
    }

    return item;
};

/**
 * @param {Object} crossbow
 * @param {Object} config
 * @returns {{server: string}}
 */
utils.getBsConfig = function (crossbow, config) {

    const cwd = config.get('cwd');

    if (crossbow.watch && crossbow.watch['bs-config']) {
        return crossbow.watch['bs-config'];
    }

    var match = [
        'bs-config.js',
        'bs-config.json',
        'bs-config.yml',
        'bs-config.yaml'
    ]
        .map(x => resolve(cwd, x))
        .filter(x => fs.existsSync(x))
        .map(x => {
            if (x.match(/yml|yaml$/)) {
                return yml.safeLoad(fs.readFileSync(x));
            }
            return require(x);
        });

    return match.length ? match[0] : undefined;
};

/**
 * Try to auto-load configuration
 * @param flags
 * @param config
 * @returns {*}
 */
utils.retrieveConfig = function (flags, config) {

    const validExts = ['.js', '.json', '.yaml', '.yml'];
    const maybes = ['crossbow.js', 'crossbow.yaml', 'crossbow.yml', 'package.json'];
    const cwd = config.get('cwd');

    if (flags.config) {
        return filterFiles([flags.config]).map(importConfig);
    } else {
        return getFiles(filterFiles(maybes)[0]);

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
        var out = []
            .concat(input)
            .map(x => {
                if (basename(x) === 'crossbow.js') {
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
            })
            .filter(x => x);

        return out;
    }

    function filterFiles(input) {
        return input
            .map(x => resolve(cwd, x))
            .filter(fs.existsSync);
    }
};

/**
 * @param arr
 * @returns {*}
 */
utils.getPresentableTaskList = function (arr) {
    return arr.map(function (item) {
        const split = item.split(' ');
        if (split.length === 3 && split[1] === 'as') {
            return split[2];
        }
        return item;
    });
};

/**
 * @param {String} cwd
 * @param {String} name
 * @returns {Array}
 */
utils.locateModule = function (cwd, name) {
    if (name.indexOf(':') > -1) {
        name = name.split(':')[0];
    }
    return [
        ['tasks', name + '.js'],
        ['tasks', name],
        [name + '.js'],
        [name],
        ['node_modules', 'crossbow-' + name]
    ]
        .map(x => resolve.apply(null, [cwd].concat(x)))
        .filter(x => fs.existsSync(x));
};

/**
 * Look at an object of any depth and perform string substitutions
 * from things like {paths.root}
 * @param {Object} item
 * @param {Object} root
 * @returns {Object}
 */
function transformStrings(item, root) {
    return traverse(item).map(function () {
        if (this.isLeaf) {
            if (typeof this.node === 'string') {
                this.update(replaceOne(this.node, root));
            }
            this.update(this.node);
        }
    });
}

/**
 * @param {String} item - the string to replace
 * @param {Object} root - Root object used for lookups
 * @returns {*}
 */
function replaceOne(item, root) {
    return item.replace(/\{\{(.+?)\}\}/g, function () {
        const match = objPath.get(root, arguments[1].split('.'));
        if (typeof match === 'string') {
            return replaceOne(match, root);
        }
        return match;
    });
}

utils.transformStrings = transformStrings;

utils.types = {
    'obj': '[object Object]',
    'string': '[object String]',
    'array': '[object Array]'
};

utils.testType = function (com, val) {
    return Object.prototype.toString.call(val) === com;
};

utils.plainObj = function (val) {
    return utils.testType(utils.types['obj'], val);
};
