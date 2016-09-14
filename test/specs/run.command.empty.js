const assert = require('chai').assert;
const execSync = require('child_process').execSync;

describe("crossbow command with no args", function () {
    it("runs without error", function () {
        assert.doesNotThrow(function () {
            execSync(`node dist/index`);
        });
    });
});
