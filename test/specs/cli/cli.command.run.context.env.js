const assert = require('chai').assert;
const exec = require('child_process').exec;

describe("accessing context from env vars", function () {
    it("it knows the context type whe it's a command", function (done) {
        exec(`node dist/cb run '@npm echo $cb_ctx_type' -q`, function (err, stdout) {
            assert.equal(stdout, 'command\n');
            done();
        });
    });
});
