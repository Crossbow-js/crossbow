import {CommandTrigger} from "./command.run";
import {Task} from "./task.resolve";
const shellAdaptor = require('./adaptors/@shell');
const bgAdaptor    = require('./adaptors/@bg');
import npmAdaptor from './adaptors/@npm';
import cbAdaptor from './adaptors/@cb';

const adaptors = {
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
    },
    'cb': {
        validate: () => true,
        create: cbAdaptor
    }
};

export = adaptors;

