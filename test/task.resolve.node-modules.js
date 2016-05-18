const assert = require('chai').assert;
const cli = require("../");
const TaskTypes = require("../dist/task.resolve").TaskTypes;
const TaskErrorTypes = require("../dist/task.errors").TaskErrorTypes;
const SequenceItemTypes = require("../dist/task.sequence.factories").SequenceItemTypes;

describe('task.resolve from installed node_modules', function () {
    it('can retrieve task-name using require()', function () {
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: 'crossbow-sass'
            }
        });
        assert.equal(runner.tasks.valid[0].tasks[0].externalTasks[0].rawInput, 'crossbow-sass');
        assert.equal(runner.tasks.valid[0].tasks[0].externalTasks[0].relative, 'node_modules/crossbow-sass/index.js');
    });
    it('can give good errors when module not found', function () {
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: 'Krossbow-scass' // typo
            }
        });
        assert.equal(runner.tasks.invalid[0].tasks[0].errors[0].type, TaskErrorTypes.TaskNotFound);
    });
    it.only('does not look at any files if the name matches a task definition', function () {
        const runner = cli.getRunner(['archy', 'kittie'], {
            tasks: {
                archy: '@npm webpack'
            }
        });

        console.log(runner.tasks.invalid[0]);
        // assert.equal(runner.tasks.valid[0].tasks[0].externalTasks[0].rawInput, 'crossbow-sass');
        // assert.equal(runner.tasks.valid[0].tasks[0].externalTasks[0].relative, 'node_modules/crossbow-sass/index.js');
        // assert.equal(runner.tasks.invalid[0].tasks[0].errors[0].type, TaskErrorTypes.TaskNotFound);
    });
});
