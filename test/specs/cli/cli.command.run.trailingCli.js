const assert = require('chai').assert;
const exec = require('child_process').exec;

describe("accessing trailing CLI input", function () {
    it("it can pass to other tasks", function (done) {
        exec(`node dist/cb run '@npm echo $CB_CLI_TRAILING' --envPrefix=cb -q -- --name=shane`, function (err, stdout) {
            if (err) return done(err);
            assert.include(stdout, '--name=shane\n');
            done();
        });
    });
});
