const assert      = require('chai').assert;
const watch       = require('../lib/command.watch');
const resolve     = require('../lib/resolve-watch-tasks');
const gatherTasks = require('../lib/gather-watch-tasks');
const yml         = require('js-yaml');

describe('Resolving watch tasks to be run before watchers begin', function () {
    it('returns a single global before task' , function () {
        const input = {
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
        };
        const gatheredTasks = resolve(['dev'], gatherTasks(input));
        const beforeTasks   = resolve.resolveBeforeTasks(input, gatheredTasks);
        assert.deepEqual(beforeTasks, ['js']);
    });
    it('returns a single global + one from before task' , function () {
        const input = {
            watch: {
                before: ['js'],
                tasks: {
                    default: {
                        "*.css": ["sass", "js"],
                        "*.js":  ["js"]
                    },
                    dev: {
                        before: ['css'],
                        watchers: [
                            {
                                "*.html": "html-min"
                            }
                        ]
                    }
                }
            }
        };
        const gatheredTasks = resolve(['dev'], gatherTasks(input));
        const beforeTasks   = resolve.resolveBeforeTasks(input, gatheredTasks);
        assert.deepEqual(beforeTasks, ['css', 'js']);
    });
});
