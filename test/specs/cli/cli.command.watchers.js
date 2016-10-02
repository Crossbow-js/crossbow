const assert = require('chai').assert;
const exec = require('child_process').execSync;

describe("list available watchers", function () {
    it("lists watchers", function () {
        assert.doesNotThrow(function () {
            exec(`node dist/cb watchers -i test/fixtures/watchers.yaml`);
        });
    });
    it("Reports when no watchers available", function () {
        assert.throws(function () {
            exec(`node dist/cb watchers --cwd test`);
        });
    });
});
