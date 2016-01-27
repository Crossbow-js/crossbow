var gruntCompat = require('./compat/compat.grunt');
var shellCompat = require('./compat/compat.shell');
var bgShellCompat = require('./compat/compat.bgShell');
var npmCompat = require('./compat/compat.npm');

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
