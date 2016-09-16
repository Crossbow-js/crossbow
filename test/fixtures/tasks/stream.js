var vfs = require('vinyl-fs');
var through2 = require('through2');

module.exports.tasks = [
    function () {
        return vfs.src('test/fixtures/js/*.js')
            .pipe(through2.obj(function (file, enc, cb) {
                setTimeout(function () {
                    cb();
                }, 5)
            }));
    },
    function () {
        return vfs.src('test/fixtures/js/*.js')
            .pipe(through2.obj(function (file, enc, cb) {
                setTimeout(function () {
                    cb();
                }, 5)
            }));
    }
];
