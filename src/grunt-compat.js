#!/usr/bin/env node

// Everything looks good. Require local grunt and run it.
var resolve = require('resolve');

module.exports = function (tasks) {
    var exec  = require('child_process').exec;
    var grun  = require('path').resolve(__dirname, '../', 'node_modules', 'grunt-cli', 'bin', 'grunt');
    var tasks = ['jshint', '--gruntfile', 'examples/Gruntfile.js', '--base', process.cwd()];
    exec([grun].concat(tasks).join(' '), function (err, stdout) {
        console.log(stdout);
    });
}
