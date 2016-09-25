const assert  = require('chai').assert;
const exec    = require('child_process').execSync;
const current = require('../../../package.json').version;

describe("Prints the version", function () {
    it("via --version flag", function () {
        const out = exec(`node dist/cb --version`);
        assert.equal(out.toString(), `${current}\n`);
    });
});
