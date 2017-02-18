const assert = require('chai').assert;
const exec = require('child_process').exec;

describe("adding environment variables at run time from a file", function () {
    it.only("it accepts .json files", function (done) {
        exec(`node dist/cb run '@sh echo $version' --envFile test/fixtures/env_file/package.json -q`, function (err, stdout) {
            console.log(stdout);
            // assert.equal(stdout, '--name=shane\n');
            done();
        });
    });
});
