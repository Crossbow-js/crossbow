const assert  = require('chai').assert;
const utils   = require('../../utils');
const defaultWatchOptions = require('../../../dist/watch.resolve').defaultWatchOptions;

describe('Resolving watch tasks', function () {
    it('can resolve all watchers when no names given', function () {
        const runner = utils.getWatcher(['shane'], {
            watch: {
                shane: {
                    before: ['js'],
                    "*.css": ["sass", "js"],
                    "*.js": ["js"],
                    "*.html": "html-min"
                }
            }
        });

        assert.equal(runner.watchTasks.valid[0].name, 'shane');
        assert.deepEqual(runner.watchTasks.valid[0].options, {});
        assert.equal(runner.watchTasks.valid[0].watchers.length, 3);
        assert.equal(runner.watchTasks.valid[0].watchers[0].patterns[0], '*.css');
        assert.deepEqual(runner.watchTasks.valid[0].watchers[0].tasks, ['sass', 'js']);
        assert.deepEqual(runner.watchTasks.valid[0].watchers[0].options, defaultWatchOptions);
    });
    it('can maintain personal before tasks even when before given globally too', function () {
        const runner = utils.getWatcher(['default', 'dev'], {
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

        assert.equal(runner.watchTasks.valid[0].before[0], '@logger');
        assert.equal(runner.watchTasks.valid[1].before.length, 0);
    });
});
