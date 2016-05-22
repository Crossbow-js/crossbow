const assert = require('chai').assert;
const cli = require("../");
const TaskTypes = require("../dist/task.resolve").TaskTypes;
const fs = require("fs");

describe('task.resolve from .sh file path', function () {
    it('can create @shell adaptor from file', function () {
        const runner = cli.getRunner(['test/fixtures/files/run.sh']);
        assert.equal(runner.tasks.valid[0].type, TaskTypes.Adaptor);
        assert.equal(runner.tasks.valid[0].adaptor, 'sh');
        assert.equal(runner.tasks.valid[0].command, fs.readFileSync('test/fixtures/files/run.sh', 'utf8'));
    });
});
