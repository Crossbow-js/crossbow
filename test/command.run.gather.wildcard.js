const assert = require('chai').assert;
const watch = require('../lib/command.watch');
const cli = require('../cli');

function handoff (cmd, input, cb) {
    return cli({
        input: ['run'].concat(cmd),
        flags: {
            handoff: true
        }
    }, input, cb);
}

describe('Gathering run tasks with wildcard', function () {
    it('can handle multi tasks with wildcard', function () {

    	var runner = handoff(['test/fixtures/tasks/single-export.js:*'], {
            config: {
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
        assert.equal(runner.sequence[0].subTaskName, 'site');
        assert.equal(runner.sequence[1].subTaskName, 'ie');
    });
});
