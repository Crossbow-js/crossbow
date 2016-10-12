const exec   = require('child_process').exec;
const assert = require('chai').assert;

describe("watch command", function () {
    it("Reports when no watchers available", function (done) {
        exec('node dist/cb watch --cwd test', function (err, stdout) {
            assert.equal(err.code, 1);
            assert.include(stdout, 'NoWatchersAvailable');
            done();
        });
    });
});
