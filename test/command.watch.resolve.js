var assert = require('chai').assert;
var resolve = require('../dist/watch.resolve').resolveWatchTasks;
const yml = require('js-yaml');

describe('Resolving watch tasks', function () {
    it.only('can resolve all watchers when no names given', function () {
        const gatheredTasks = resolve({
            watch: {
                before: ['js'],
                "*.css": ["sass", "js"],
                "*.js": ["js"],
                "*.html": "html-min"
            }
        });

        //console.log(gatheredTasks);
        //assert.isObject(watchTasks.default);
        //assert.isArray(watchTasks.default.watchers);
        //assert.isObject(watchTasks.dev);
        //assert.isArray(watchTasks.dev.watchers);
    });
    it('can resolve a single watcher when a name is given', function () {
        const gatheredTasks = gatherTasks({
            watch: {
                before: ['js'],
                tasks: {
                    default: {
                        "*.css": ["sass", "js"],
                        "*.js":  ["js"]
                    },
                    dev: {
                        "*.html": "html-min"
                    }
                }
            }
        });

        const watchTasks = resolve(['dev'], gatheredTasks);
        assert.isUndefined(watchTasks.default);
        assert.isObject(watchTasks.dev);
        assert.isArray(watchTasks.dev.watchers);
    });
    it('can resolve multiple watchers when multiple given', function () {
        const gatheredTasks = gatherTasks({
            watch: {
                before: ['js'],
                tasks: {
                    default: {
                        "*.css": ["sass", "js"],
                        "*.js":  ["js"]
                    },
                    dev: {
                        "*.html": "html-min"
                    }
                }
            }
        });

        const watchTasks = resolve(['dev', 'default'], gatheredTasks);
        assert.isObject(watchTasks.default);
        assert.isArray(watchTasks.default.watchers);
        assert.isObject(watchTasks.dev);
        assert.isArray(watchTasks.dev.watchers);
    });
});
