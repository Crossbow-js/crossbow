const gruntAdaptor = require('./adaptors/@grunt');
const shellAdaptor = require('./adaptors/@shell');
const bgAdaptor    = require('./adaptors/@bg');
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
    'sh': {
        validate: () => true,
        create: shellAdaptor
    },
    'bg': {
        validate: () => true,
        create: bgAdaptor
    },
    'bgnpm': {
        validate: () => true,
        create: bgAdaptor
    },
    'npm': {
        validate: () => true,
        create: npmAdaptor
    }
};

export = adaptors;

