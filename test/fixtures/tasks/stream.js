var gulp = require('gulp');
var through2 = require('through2');

module.exports.tasks = [
    function () {
        return gulp.src('test/fixtures/js/*.js')
            .pipe(through2.obj(function (file, enc, cb) {
                setTimeout(function () {
                    cb();
                }, 5)
            }));
    },
    function () {
        return gulp.src('test/fixtures/js/*.js')
            .pipe(through2.obj(function (file, enc, cb) {
                setTimeout(function () {
                    cb();
                }, 5)
            }));
    }
];