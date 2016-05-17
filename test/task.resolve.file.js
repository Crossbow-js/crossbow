const assert = require('chai').assert;
const cli = require("../");
const TaskTypes = require("../dist/task.resolve").TaskTypes;
const TaskRunModes = require("../dist/task.resolve").TaskRunModes;
const SequenceItemTypes = require("../dist/task.sequence.factories").SequenceItemTypes;

describe('task.resolve from file path', function () {
    it('can retrieve task-name using file-lookup', function () {
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: 'test/fixtures/tasks/error.js'
            }
        });
        assert.equal(runner.tasks.valid[0].tasks[0].externalTasks[0].rawInput, 'test/fixtures/tasks/error.js');
        assert.equal(runner.tasks.valid[0].tasks[0].externalTasks[0].relative, 'test/fixtures/tasks/error.js');
    });
});
