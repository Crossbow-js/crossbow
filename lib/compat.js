var gruntCompat = require('./adaptors/compat.grunt');
var shellCompat = require('./adaptors/compat.shell');
var bgShellCompat = require('./adaptors/compat.bgShell');
var npmCompat = require('./adaptors/compat.npm');

var c = exports;

c.compatAdaptors = {
    'grunt': {
        validate () {
            try {
                return require.resolve('grunt');
            } catch (e) {
                return false;
            }
        },
        create: gruntCompat
    },
    'shell': {
        validate: () => true,
        create: shellCompat
    },
    'npm': {
        validate: () => true,
        create: npmCompat
    },
    'bgShell': {
        validate: () => true,
        create: bgShellCompat
    }
};
