const assert  = require('chai').assert;
const exec    = require('child_process').execSync;

describe("exiting with non-zero", function () {
    it("on missing reporters", function () {
        assert.throws(function () {
            exec(`node dist/cb run -r shane.js`);
        });
    });
    it("on missing input files", function () {
        assert.throws(function () {
            exec(`node dist/cb run -c nahnah`);
        });
    });
});
