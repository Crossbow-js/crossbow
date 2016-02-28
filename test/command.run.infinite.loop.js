var assert = require('chai').assert;
var cli = require("../");

describe('Detecting infinite loops in task definitions', function () {
    it('Can defend against an infinite loop of task resolutions', function () {
        assert.throws(function () {
            cli.getRunner(["js", "test/fixtures/tasks/stream.js"], {
                tasks: {
                    js: ["dummy"],
                    dummy: ["test/fixtures/tasks/simple.js", "test/fixtures/tasks/simple2.js", "js"]
                }
            });
        })
    });
});
