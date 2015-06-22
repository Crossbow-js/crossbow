var objPath  = require('object-path');
var utils = exports;

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