const assert = require('chai').assert;
const cli = require("../../");
const TaskTypes = require("../../dist/task.resolve").TaskTypes;

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
    it('can retrieve task-name using file-lookup + cbflags', function () {
        const runner = cli.getRunner(['js@p'], {
            tasks: {
                js: 'test/fixtures/tasks/error.js'
            }
        });
        assert.equal(runner.tasks.valid[0].rawInput, 'js@p');
        assert.equal(runner.tasks.valid[0].tasks[0].externalTasks[0].rawInput, 'test/fixtures/tasks/error.js');
        assert.equal(runner.tasks.valid[0].tasks[0].externalTasks[0].relative, 'test/fixtures/tasks/error.js');
    });
    it('can retrieve task-name using file-lookup without tasks definitions', function () {
        const runner = cli.getRunner(['test/fixtures/tasks/error.js'], {});
        assert.equal(runner.tasks.valid[0].externalTasks[0].rawInput, 'test/fixtures/tasks/error.js');
        assert.equal(runner.tasks.valid[0].externalTasks[0].relative, 'test/fixtures/tasks/error.js');
    });
    it('can retrieve task-name using file-lookup with leading . (dot)', function () {
        const runner = cli.getRunner(['./test/fixtures/tasks/error.js'], {});
        assert.equal(runner.tasks.valid[0].type, TaskTypes.ExternalTask);
    });
});
