var assert  = require('chai').assert;
var cli = require('../');
var defaultWatchOptions = require('../dist/watch.resolve').defaultWatchOptions;

describe('Resolving watch tasks', function () {
    it('can resolve all watchers when no names given', function () {
        const runner = cli({
            input: ['watch', 'shane'],
            flags: {handoff: true}
        }, {
            watch: {
                shane: {
                    before: ['js'],
                    "*.css": ["sass", "js"],
                    "*.js": ["js"],
                    "*.html": "html-min"
                }
            }
        });

        assert.equal(runner.tasks.valid[0].name, 'shane');
        assert.deepEqual(runner.tasks.valid[0].options, {});
        assert.equal(runner.tasks.valid[0].watchers.length, 3);
        assert.equal(runner.tasks.valid[0].watchers[0].patterns[0], '*.css');
        assert.deepEqual(runner.tasks.valid[0].watchers[0].tasks, ['sass', 'js']);
        assert.deepEqual(runner.tasks.valid[0].watchers[0].options, defaultWatchOptions);
    });
    it('can maintain personal before tasks even when before given globally too', function () {
        const runner = cli({
            input: ['watch', 'default', 'dev'],
            flags: {handoff: true}
        }, {
            watch: {
                before: ['js', 'sass'],
                default: {
                    before: ['@logger'],
                    "*.css": ["sass", "js"],
                    "*.js":  ["js"]
                },
                dev: {
                    "*.html": "html-min"
                }
            }
        });

        assert.equal(runner.tasks.valid[0].before[0], '@logger');
        assert.equal(runner.tasks.valid[1].before.length, 0);
    });
});
