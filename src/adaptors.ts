const gruntAdaptor   = require('./adaptors/@grunt');
const shellAdaptor   = require('./adaptors/@shell');
//const bgShellAdaptor = require('./adaptors/@bgShell.js');
import npmAdaptor from './adaptors/@npm';

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

