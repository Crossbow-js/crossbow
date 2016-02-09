const gruntAdaptor   = require('./adaptors/@grunt.js');
const shellAdaptor   = require('./adaptors/@shell.js');
//const bgShellAdaptor = require('./adaptors/@bgShell.js');
const npmAdaptor     = require('./adaptors/@npm.js');

const adaptors = {
    'grunt': {
        validate () {
            try {
                const installPath = require.resolve('grunt');
                return true;
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
    //'bgShell': {
    //    validate: () => true,
    //    create: bgShellAdaptor
    //}
};

export = adaptors;

