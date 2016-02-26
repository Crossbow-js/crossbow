var assert  = require('chai').assert;
var resolve = require('../dist/watch.resolve').resolveWatchTasks;
var defaultWatchOptions = require('../dist/watch.resolve').defaultWatchOptions;

describe('Resolving watch tasks', function () {
    it('can resolve all watchers when no names given', function () {
        const gatheredTasks = resolve({
            watch: {
                shane: {
                    before: ['js'],
                    "*.css": ["sass", "js"],
                    "*.js": ["js"],
                    "*.html": "html-min"
                }
            }
        });

        assert.equal(gatheredTasks[0].name, 'shane');
        assert.deepEqual(gatheredTasks[0].options, {});
        assert.equal(gatheredTasks[0].watchers.length, 3);
        assert.equal(gatheredTasks[0].watchers[0].patterns[0], '*.css');
        assert.deepEqual(gatheredTasks[0].watchers[0].tasks, ['sass', 'js']);
        assert.deepEqual(gatheredTasks[0].watchers[0].options, defaultWatchOptions);
    });
    it('can maintain personal before tasks even when before given globally too', function () {
        const gatheredTasks = resolve({
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

        assert.equal(gatheredTasks[0].before[0], '@logger');
        assert.equal(gatheredTasks[1].before.length, 0);
    });
});
