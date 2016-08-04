const assert = require('chai').assert;
const exec = require('child_process').exec;

describe("list available tasks", function () {
    it("lists tasks in simple format", function (done) {
        exec(`node dist/index tasks -c examples/crossbow.js`, function (err, stdout, stderr) {
            assert.include(stdout, 'Available Tasks:\n»  webpack');
            done();
        });
    });
    it("lists tasks in verbose format", function (done) {
        exec(`node dist/index tasks -c examples/crossbow.js -v`, function (err, stdout, stderr) {
            assert.include(stdout, 'Available tasks:\n   ├─┬ webpack\n');
            done();
        });
    });
});
