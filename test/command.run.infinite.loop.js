var assert = require('chai').assert;
var cli = require("../cli");

describe('Detecting infinite loops in task definition', function () {
    it('Can combine files to form sequence from alias', function () {
        assert.throws(function () {
            cli({
                input: ["run", "js", "test/fixtures/tasks/stream.js"]
            }, {
                tasks: {
                    js: ["dummy"],
                    dummy: ["test/fixtures/tasks/simple.js", "test/fixtures/tasks/simple2.js", "js"]
                }
            });
        })
    });
});
