const assert = require('chai').assert;
const cli = require("../../");
const TaskTypes = require("../../dist/task.resolve").TaskTypes;
const TaskErrorTypes = require("../../dist/task.errors").TaskErrorTypes;

describe('task.resolve from installed node_modules', function () {
    it('can retrieve task-name using require()', function () {
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: 'crossbow-sass'
            }
        });
        assert.equal(runner.tasks.valid[0].rawInput, 'js');
        assert.equal(runner.tasks.valid[0].tasks[0].externalTasks[0].rawInput, 'crossbow-sass');
        assert.equal(runner.tasks.valid[0].tasks[0].externalTasks[0].relative, 'node_modules/crossbow-sass/index.js');
    });
    it('can retrieve task-name using require() + sub tasks + flags', function () {
        const runner = cli.getRunner(['js@p'], {
            tasks: {
                js: 'crossbow-sass:cat'
            },
            options: {
                'crossbow-sass': {
                    'cat': {name:'kittie'}
                }
            }
        });
        assert.equal(runner.tasks.valid[0].rawInput, 'js@p');
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
    it('does not look at any files if the name matches a task definition', function () {
        const runner = cli.getRunner(['archy'], {
            tasks: {
                archy: ['@npm webpack']
            }
        });
        assert.equal(runner.tasks.valid[0].tasks[0].type, TaskTypes.Adaptor);
    });
});
