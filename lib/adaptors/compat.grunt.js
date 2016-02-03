var path = require('path');

module.exports = function (input, config, item) {
    return function (obs) {
        var grunt = require('grunt');
        grunt.tasks(item.rawInput.split(' ').filter(x => x.length), {
            gruntfile: path.resolve(config.get('cwd'), input.gruntfile),
            base: config.get('cwd'),
            tasks: [],
            npm: []
        }, function (err) {
            if (err) {
                return obs.onError(err);
            }
            obs.onCompleted();
        });
    };
};
