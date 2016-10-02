const assert      = require('chai').assert;
const utils       = require('../../utils');
const watchErrors = require('../../../dist/watch.errors').WatchTaskErrorTypes;
const errors      = require('../../../dist/task.errors').TaskErrorTypes;

describe('Resolving watch task errors', function () {
    it('returns the error when the task is missing from the' , function () {
        const runner = utils.getWatcher(["defaultpl"]);
        assert.equal(runner.watchTasks.invalid.length, 1);
        assert.equal(runner.watchTasks.invalid[0].errors[0].type, watchErrors.WatchTaskNameNotFound);
    });
    it('returns multiple errors when none found' , function () {
        const runner = utils.getWatcher(["defaultpl", "shane"]);
        assert.equal(runner.watchTasks.invalid.length, 2);
        assert.equal(runner.watchTasks.invalid[0].errors[0].type, watchErrors.WatchTaskNameNotFound);
        assert.equal(runner.watchTasks.invalid[1].errors[0].type, watchErrors.WatchTaskNameNotFound);
    });
    it('returns errors about global before task that is invalid' , function () {
        const runner = utils.getWatcher(["def"], {
            watch: {
                before: "@ns",
                def: {
                    "app/**": ['js']
                }
            },
            tasks: {
                js: 'test/fixtures/tasks/stream.js'
            }
        });
        assert.equal(runner.beforeTasks.tasks.invalid.length, 1);
    });
    it('returns errors about global before task that is invalid + local before task that is invalid' , function () {
        const runner = utils.getWatcher(["def"], {
            watch: {
                before: "@ns",
                def: {
                    before: "css",
                    "app/**": ["js"]
                }
            },
            tasks: {
                js: 'test/fixtures/tasks/stream.js'
            }
        });
        assert.equal(runner.beforeTasks.tasks.invalid.length, 2);
    });
    it('returns errors when others are valid' , function () {
        const runner = utils.getWatcher(["def", "shane"], {
            watch: {
                before: "@ns",
                def: {
                    before: "css",
                    "app/**": ["js"]
                },
                shane: {
                    before: "js",
                    "app/**": ["js"]
                }
            },
            tasks: {
                js: 'test/fixtures/tasks/stream.js'
            }
        });
        assert.equal(runner.beforeTasks.tasks.invalid.length, 2);
    });
    it('returns errors when tasks are invalid' , function () {
        const runner = utils.getWatcher(["def"], {
            watch: {
                def: {
                    "app/**": ["jss"]
                }
            },
            tasks: {
                js: 'test/fixtures/tasks/stream.js'
            }
        });
        assert.equal(runner.watchRunners.invalid[0]._tasks.invalid.length, 1);
        assert.equal(runner.watchRunners.invalid[0]._tasks.invalid[0].errors[0].type, errors.TaskNotFound);
    });
});
