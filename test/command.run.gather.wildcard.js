const assert = require('chai').assert;
const cli = require('../');

describe('Gathering run tasks with wildcard', function () {

    it('can handle multi tasks with wildcard', function () {

    	const runner = cli.getRunner(['test/fixtures/tasks/single-export.js:*'], {
            options: {
                "test/fixtures/tasks/single-export.js": {
                    site: {
                        input: ['css/core.scss']
                    },
                    ie: {
                        input: ['css/ie.scss']
                    }
                }
            }
        });

        assert.equal(runner.sequence.length, 2);
        assert.equal(runner.sequence[0].task.taskName, 'test/fixtures/tasks/single-export.js');
        assert.equal(runner.sequence[0].options.input[0], 'css/core.scss');
        assert.equal(runner.sequence[1].task.taskName, 'test/fixtures/tasks/single-export.js');
        assert.equal(runner.sequence[1].options.input[0], 'css/ie.scss');
    });
});
