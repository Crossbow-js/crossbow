const assert = require('chai').assert;
const cli = require("../");
const TaskTypes = require("../dist/task.resolve").TaskTypes;

describe('task.resolve from .sh file path', function () {
    it.only('can create @shell adaptor from file', function () {
        const runner = cli.getRunner(['test/fixtures/files/run.sh']);
        assert.equal(runner.tasks.valid[0].type, TaskTypes.Adaptor);
    });
});
