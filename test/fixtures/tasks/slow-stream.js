var gulp = require('gulp');
var through2 = require('through2');

module.exports = function () {
    var count = 0;
    var to;
    return gulp.src('test/fixtures/js/*.js')
        .pipe(through2.obj(function (file, enc, cb) {
            to = setTimeout(function () {
                console.log('ere', count++);
                cb();
            }, 500);
        }));
};
