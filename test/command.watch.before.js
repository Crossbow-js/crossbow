var assert = require('chai').assert;
var watch = require('../lib/command.watch');
var resolve = require('../lib/resolve-watch-tasks');
var gatherTasks = require('../lib/gather-watch-tasks');
const yml = require('js-yaml');

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
});
