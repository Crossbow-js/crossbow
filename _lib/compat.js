var gruntCompat = require('./grunt-compat');
var shellCompat = require('./shell-compat');

var c = exports;

c.compatAdaptors = {
    "grunt": {
        validate: function validate() {
            try {
                return require.resolve('grunt');
            } catch (e) {
                return false;
            }
        },
        create: gruntCompat
    },
    "shell": {
        validate: function validate() {
            return true;
        },
        create: shellCompat
    }
};