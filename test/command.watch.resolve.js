var assert = require('chai').assert;
var watch = require('../lib/command.watch');
var resolve = require('../lib/resolve-watch-tasks');
var gatherTasks = require('../lib/gather-watch-tasks');
const yml = require('js-yaml');

describe('Resolving watch tasks', function () {
    it('can resolve all watchers when no names given', function () {
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

        const watchTasks = resolve([], gatheredTasks);
        assert.isObject(watchTasks.default);
        assert.isArray(watchTasks.default.watchers);
        assert.isObject(watchTasks.dev);
        assert.isArray(watchTasks.dev.watchers);
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
