const assert = require('chai').assert;
const exec = require('child_process').exec;

describe("Exit codes following error", function () {
    it("should exit with exit code 1", function (done) {
        exec('node dist/cb run "@npm sleep"', function (err) {
            assert.deepEqual(err.code, 1);
            done();
        });
    });
    it("should not exit with exit code 1 if --no-fail flag given", function (done) {
        exec('node dist/cb run "@npm sleep" --no-fail', function (err, stdout) {
            assert.isNull(err);
            done();
        });
    });
    it("should exit with without error", function (done) {
        exec('node dist/cb run "@npm sleep 0.1"', function (err) {
            assert.isNull(err);
            done();
        });
    });
});
