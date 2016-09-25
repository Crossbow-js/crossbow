const assert = require('chai').assert;
const utils    = require('../../utils');

describe('using tasks given as flags as before', function () {
    it('uses the before tasks given in cli.flags' , function () {
        const runner = utils.getWatcher(['default'], {
            watch: {
                default: {
                    "*.css": ["sass", "js"],
                    "*.js":  ["js"]
                },
                dev: {
                    "*.html": "html-min"
                }
            },
            tasks: {
                js: "test/fixtures/tasks/observable.js"
            }
        }, {
            before: ['js']
        });

        assert.equal(runner.before.tasks.valid.length, 1);
        assert.equal(runner.before.tasks.valid[0].taskName, 'js');
        assert.equal(runner.before.tasks.valid[0].tasks[0].taskName, 'test/fixtures/tasks/observable.js');
    });
});
