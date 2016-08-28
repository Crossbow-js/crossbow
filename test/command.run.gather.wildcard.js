const assert = require('chai').assert;
const cli = require('../');
const types = require("../dist/task.sequence.factories").SequenceItemTypes;

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

        assert.equal(runner.sequence.length, 1);
        assert.equal(runner.sequence[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items.length, 2);
        assert.equal(runner.sequence[0].items[0].options.input[0], 'css/core.scss');
        assert.equal(runner.sequence[0].items[1].options.input[0], 'css/ie.scss');
    });
});
