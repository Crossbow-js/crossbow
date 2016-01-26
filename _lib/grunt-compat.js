var path = require('path');

module.exports = function (input, config, item) {
    return function (obs) {

        var grunt = require('grunt');
        grunt.tasks(item.rawInput.split(' '), {
            gruntfile: path.resolve(config.get('cwd'), input.gruntfile),
            base: config.get('cwd'),
            tasks: [],
            npm: []
        }, function (err, output) {
            if (err) {
                return obs.onError(err);
            }
            obs.onCompleted();
        });
    };

    //var exec  = require('child_process').exec;
    //var grun  = require('path').resolve(__dirname, '../', 'node_modules', 'grunt-cli', 'bin', 'grunt');
    //var tasks = ['jshint:dev', '--gruntfile', 'examples/Gruntfile.js', '--base', process.cwd()];
    //
    //exec([grun].concat(tasks).join(' '), function (err, stdout) {
    //    console.log(stdout);
    //});
};

//module.exports

//module.exports = function (tasks) {
//    var exec  = require('child_process').exec;
//    var grun  = require('path').resolve(__dirname, '../', 'node_modules', 'grunt-cli', 'bin', 'grunt');
//    var tasks = ['jshint', '--gruntfile', 'examples/Gruntfile.js', '--base', process.cwd()];
//    exec([grun].concat(tasks).join(' '), function (err, stdout) {
//        console.log(stdout);