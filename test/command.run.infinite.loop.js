var assert = require('chai').assert;
var cli = require("../");
var TaskErrorTypes = require('../dist/task.errors').TaskErrorTypes;

describe('Detecting Circular references in task definitions', function () {
    it('Can defend against an infinite loop of task resolutions', function () {
        const runner = cli.getRunner(["js", "test/fixtures/tasks/stream.js"], {
            tasks: {
                js: ["dummy"],
                dummy: ["test/fixtures/tasks/simple.js", "test/fixtures/tasks/simple2.js", "js"]
            }
        });
        assert.equal(runner.tasks.invalid[0].tasks[0].tasks[0].errors.length, 0);
        assert.equal(runner.tasks.invalid[0].tasks[0].tasks[1].errors.length, 0);
        assert.equal(runner.tasks.invalid[0].tasks[0].tasks[2].errors[0].type, TaskErrorTypes.CircularReference);
    });
});
