const assert = require('chai').assert;
const utils = require("../../utils");
const SequenceItemTypes = require("../../../dist/task.sequence.factories").SequenceItemTypes;

describe('task.resolve object literals with task description', function () {
    it('applies description to current task', function () {
        const runner = utils.getRunner(['js'], {
            tasks: {
                js: {
                    input: '@npm sleep 0.1',
                    description: "Runs the JS task"
                }
            }
        });
        assert.equal(runner.tasks.valid[0].tasks[0].description, "Runs the JS task");
    });
    it('applies description for multiple child tasks', function () {
        const runner = utils.getRunner(['js', 'haml'], {
            tasks: {
                'js': {
                    tasks: ['css', 'haml'],
                    description: 'Run both tasks in sequence',
                    runMode: 'parallel'
                },
                css: {
                    input: '@npm sleep $',
                    env: {
                        SSLLEEPP: '0.2'
                    }
                },
                haml: '@npm sleep 0.1'
            }
        });
        assert.equal(runner.tasks.valid[0].description, 'Run both tasks in sequence');
        assert.equal(runner.tasks.valid[0].tasks[0].description, '');
        assert.equal(runner.tasks.valid[0].tasks[1].description, '');

        assert.equal(runner.sequence[0].type, SequenceItemTypes.ParallelGroup);
    });
});
