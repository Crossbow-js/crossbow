const assert = require('chai').assert;
const cli = require("../");

const TaskRunModes = require('../dist/task.resolve').TaskRunModes;

describe('Gathering run tasks (1)', function () {
    it('Accepts single string for adaptor task', function () {
        var runner = cli.getRunner(['@npm ls'], {});

        assert.equal(runner.tasks.valid[0].taskName, '@npm ls');
        assert.equal(runner.tasks.valid[0].command, 'ls');
    });
    it('can gather from a default yaml file', function () {
        const runner = cli.getRunner(['js'], {}, {
            config: 'examples/crossbow.yaml'
        });
        assert.equal(runner.tasks.valid.length, 1);
    });
    it('can gather simple tasks', function () {

        const runner = cli.getRunner(['test/fixtures/tasks/simple.js:dev'], {
            options: {
                "test/fixtures/tasks/simple.js": {
                    dev: {
                        input: "scss/scss/core.scss",
                        output: "css/scss/core.min.css"
                    }
                }
            }
        });

        assert.equal(runner.tasks.valid[0].subTasks.length, 1);
    });
    it('can gather tasks when multi given in alias', function () {
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: ['test/fixtures/tasks/simple.js:dev', "test/fixtures/tasks/simple.js:default"]
            },
            options: {
                "test/fixtures/tasks/simple.js": {
                    default: {
                        input: "scss/core.scss",
                        output: "css/core.css"
                    },
                    dev: {
                        input: "scss/main.scss",
                        output: "css/main.min.css"
                    }
                }
            }
        });

        assert.equal(runner.tasks.valid[0].taskName, 'js');
        assert.equal(runner.tasks.valid[0].tasks[0].taskName, 'test/fixtures/tasks/simple.js');
        assert.equal(runner.tasks.valid[0].tasks[0].subTasks[0], 'dev');

        assert.equal(runner.tasks.valid[0].taskName, 'js');
        assert.equal(runner.tasks.valid[0].tasks[1].taskName, 'test/fixtures/tasks/simple.js');
        assert.equal(runner.tasks.valid[0].tasks[1].subTasks[0], 'default');
    });
    it('can gather multiple valid tasks when using an alias', function () {
        const runner = cli.getRunner(["css", "js"], {
            tasks: {
                css: ['test/fixtures/tasks/simple.js', 'test/fixtures/tasks/simple2.js'],
                js: ['test/fixtures/tasks/simple.js']
            }
        });
        var first = runner.tasks.valid[0];
        assert.equal(first.taskName, 'css');
        assert.equal(first.externalTasks.length, 0);
        assert.equal(first.tasks.length, 2);
        assert.equal(first.tasks[0].tasks.length, 0);
        assert.equal(first.tasks[0].taskName, 'test/fixtures/tasks/simple.js');
        assert.equal(first.tasks[1].taskName, 'test/fixtures/tasks/simple2.js');
    });
    it('can tasks with inline flags', function () {
        const runner = cli.getRunner(['js@p'], {
            tasks: {
                js: ['test/fixtures/tasks/simple.multi.js']
            }
        });

        assert.equal(runner.tasks.valid[0].runMode, TaskRunModes.parallel);
        assert.equal(runner.tasks.valid[0].tasks[0].runMode, TaskRunModes.series);
    });
});
