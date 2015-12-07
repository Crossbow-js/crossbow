var gruntCompat = require('./grunt-compat');
var shellCompat = require('./shell-compat');
var bgShellCompat = require('./bgShell-compat');
var npmCompat = require('./npm-compat');

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
        validate: (input, config) => {
            var readPkgUp = require('read-pkg-up');
            var pkg = readPkgUp.sync({cwd: config.get('cwd')}).pkg;
            return pkg.name && pkg.scripts;
        },
        create: npmCompat
    },
    'bgShell': {
        validate: () => true,
        create: bgShellCompat
    }
};
