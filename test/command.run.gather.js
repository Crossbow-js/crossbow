const assert = require('chai').assert;
const cli = require("../");

function handoff(cmd, input, cb) {
    return cli({
        input: ['run'].concat(cmd),
        flags: {
            handoff: true
        }
    }, input, cb);
}

describe('Gathering run tasks', function () {
    it('Accepts single string for adaptor task', function () {
        var runner = handoff(['@npm ls'], {});

        assert.equal(runner.tasks.valid[0].taskName, '@npm ls');
        assert.equal(runner.tasks.valid[0].command, 'ls');
    });
    it('can gather from a default yaml file', function () {
        const runner = cli({
            input: ["run", "js"],
            flags: {
                config: 'examples/crossbow.yaml',
                handoff: true
            }
        });
        assert.equal(runner.tasks.valid.length, 1);
    });
    it('can gather simple tasks', function () {

        const runner = cli({
            input: ['run', 'test/fixtures/tasks/simple.js:dev'],
            flags: {
                handoff: true
            }
        }, {
            config: {
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
        const runner = cli({
            input: ['run', 'js'],
            flags: {
                handoff: true
            }
        }, {
            tasks: {
                js: ['test/fixtures/tasks/simple.js:dev', "test/fixtures/tasks/simple.js:default"]
            },
            config: {
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
        const runner = cli({
            input: ["run", "css", "js"],
            flags: {handoff: true}
        }, {
            tasks: {
                css: ['test/fixtures/tasks/simple.js', 'test/fixtures/tasks/simple2.js'],
                js: ['test/fixtures/tasks/simple.js']
            }
        });
        var first = runner.tasks.valid[0];
        assert.equal(first.taskName, 'css');
        assert.equal(first.modules.length, 0);
        assert.equal(first.tasks.length, 2);
        assert.equal(first.tasks[0].tasks.length, 0);
        assert.equal(first.tasks[0].taskName, 'test/fixtures/tasks/simple.js');
        assert.equal(first.tasks[1].taskName, 'test/fixtures/tasks/simple2.js');
    });
    it.skip('can gather a tasks array given in module', function () {
        const runner = cli({
            input: ["run", "js"],
            flags: {handoff: true}
        }, {
            tasks: {
                js: ['test/fixtures/tasks/simple.multi.js']
            }
        });
        assert.equal(runner.tasks.valid.length, 2);
        //assert.equal(first.tasks.length, 2);
        //var first = runner.tasks.valid[0];
        //assert.equal(first.taskName, 'css');
        //assert.equal(first.modules.length, 0);
        //assert.equal(first.tasks[0].tasks.length, 0);
        //assert.equal(first.tasks[0].taskName, 'test/fixtures/tasks/simple.js');
        //assert.equal(first.tasks[1].taskName, 'test/fixtures/tasks/simple2.js');
    });
});
