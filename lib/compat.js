const gruntAdaptor   = require('./adaptors/@grunt.js');
const shellAdaptor   = require('./adaptors/@shell.js');
const bgShellAdaptor = require('./adaptors/@bgShell.js');
const npmAdaptor     = require('./adaptors/@npm.js');

module.exports.adaptors = {
    'grunt': {
        validate () {
            try {
                return require.resolve('grunt');
            } catch (e) {
                return false;
            }
        },
        create: gruntAdaptor
    },
    'shell': {
        validate: () => true,
        create: shellAdaptor
    },
    'npm': {
        validate: () => true,
        create: npmAdaptor
    },
    'bgShell': {
        validate: () => true,
        create: bgShellAdaptor
    }
};
