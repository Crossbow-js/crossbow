var gulp = require('gulp');
var through2 = require('through2');

module.exports.tasks = [
    function (obs) {
        return gulp.src('test/fixtures/js/*.js')
            .pipe(through2.obj(function (file, enc, cb) {
                setTimeout(function () {
                    obs.log.info('Stream task 1');
                    cb();
                }, 5)
            }));
    },
    function (obs) {
        return gulp.src('test/fixtures/js/*.js')
            .pipe(through2.obj(function (file, enc, cb) {
                setTimeout(function () {
                    obs.log.info('Stream task 2');
                    cb();
                }, 5)
            }));
    }
];