const assert = require('chai').assert;
const cli    = require('../../');

describe('Resolving watch tasks to be run before watchers begin', function () {
    it('returns a single global before task' , function () {
        const runner = cli.getWatcher(['default'], {
            watch: {
                before: ['js'],
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
        });

        assert.equal(runner.before.tasks.valid.length, 1);
        assert.equal(runner.before.tasks.valid[0].taskName, 'js');
        assert.equal(runner.before.tasks.valid[0].tasks[0].taskName, 'test/fixtures/tasks/observable.js');
    });
    it('returns a single global + one from before task' , function () {
        const runner = cli.getWatcher(['dev'], {
            watch: {
                before: ['js'],
                default: {
                    "*.css": ["sass", "js"],
                    "*.js":  ["js"]
                },
                dev: {
                    before: ['css'],
                    "*.html": "html-min"
                }
            },
            tasks: {
                js: "test/fixtures/tasks/observable.js",
                css: "test/fixtures/tasks/stream.js"
            }
        });
        assert.equal(runner.before.tasks.valid.length, 2);
        assert.equal(runner.before.tasks.valid[0].taskName, 'js');
        assert.equal(runner.before.tasks.valid[1].taskName, 'css');
    });
    it('returns a single global + one from each before task (3 total)' , function () {
        const runner = cli.getWatcher(['dev', 'default'], {
            watch: {
                before: ['js'],
                default: {
                    before: ['build'],
                    "*.css": ["sass", "js"],
                    "*.js":  ["js"]
                },
                dev: {
                    before: ['css'],
                    "*.html": "html-min"
                }
            },
            tasks: {
                js: "test/fixtures/tasks/observable.js",
                css: "test/fixtures/tasks/stream.js",
                build: "test/fixtures/tasks/simple.js"
            }
        });
        assert.equal(runner.before.tasks.valid.length, 3);
        assert.equal(runner.before.tasks.valid[0].taskName, 'js');
        assert.equal(runner.before.tasks.valid[1].taskName, 'css');
        assert.equal(runner.before.tasks.valid[2].taskName, 'build');
    });
});
