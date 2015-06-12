var prefix = "{magenta:crossbow} {cyan:::} }";
var logger  = require("eazy-logger").Logger({
    prefix: prefix,
    useLevelPrefixes: false,
    logLevel: 'warn'
});

module.exports         = logger;
module.exports.compile = require('eazy-logger').compile;
module.exports.prefix  = prefix;
module.exports.infoPrefix = prefix + '{cyan:[info]} ';
