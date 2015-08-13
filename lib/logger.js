var prefix = "{magenta:      crossbow }{gray:::} }";
var logger = require("eazy-logger").Logger({
    prefix: prefix,
    useLevelPrefixes: false,
    logLevel: 'warn',
    custom: {
        "ok": function ok(out) {
            return this.compile('{green:✔}');
        },
        "err": function err() {
            return this.compile('{red:[ERROR]}');
        }
    }
});

module.exports = logger;
module.exports.compile = require('eazy-logger').compile;
module.exports.prefix = prefix;
module.exports.infoPrefix = prefix + '{cyan:[info]} ';