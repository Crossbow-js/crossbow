var gulp = require('gulp');
var through2 = require('through2');

gulp.task('shane', function (cb) {
    var count = 0;
    require('./example/crossbow').tasks.error.call();
    cb();
});

gulp.task('kittie', function (cb) {
    console.log('Kittie Ran');
    cb();
});

gulp.task('default', gulp.parallel('shane','kittie'));
