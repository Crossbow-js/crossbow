var prefix = '{magenta.bold:cb {gray::} }';
var logger  = require('eazy-logger').Logger({
    prefix: prefix,
    useLevelPrefixes: false,
    logLevel: 'info',
    levels: {
        fileInfo: 399
    },
    custom: {
        'ok': function () {
            return this.compile('{green:✔}');
        },
        'err': function () {
            return this.compile('{red:x}');
        }
    }
});

export default logger;
export const compile = require('eazy-logger').compile;
//export var compile = require('eazy-logger').compile;
//module.exports.compile    = require('eazy-logger').compile;
//module.exports.prefix     = prefix;
//module.exports.infoPrefix = prefix + '{cyan:[info]} ';
