var gruntCompat = require('./grunt-compat');

var c = exports;

c.compatAdaptors = {
    "grunt": {
        validate: () => {
            try {
                return require.resolve('grunt');
            } catch (e) {
                return false;
            }
        },
        create: gruntCompat
    }
};