const assert = require('chai').assert;
const exec = require('child_process').exec;

describe("setting a bin directory", function () {
    it('accepts overrides from external input file', function (done) {
        exec("node dist/cb run my-bin-task --bin test/fixtures/.bin -q", function (err, stdout) {
            assert.equal(stdout, 'booya!\n');
            done();
        });
    });
});
