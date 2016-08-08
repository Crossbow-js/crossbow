const assert = require('chai').assert;
const exec = require('child_process').exec;
const current = require('../package.json').version;

describe("Prints the version", function () {
    it("via --version flag", function (done) {
        exec(`node dist/index --version`, function (err, stdout) {
            assert.equal(stdout, `${current}\n`);
            done();
        });
    });
});
