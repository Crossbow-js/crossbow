const assert  = require('chai').assert;
const exec    = require('child_process').execSync;
const current = require('../../../package.json').version;

describe("Prints the help if no command/tasks given", function () {
    it("prints help", function () {
        const out = exec(`node dist/cb`);
        assert.include(out.toString(), `Usage: crossbow [command] [..args] [OPTIONS]`);
    });
});
