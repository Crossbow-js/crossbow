const assert = require('chai').assert;
const cli = require("../../../dist/public/index");
const utils = require("../../utils");


describe('Gathering run tasks', function () {
    it('Accepts single string for on-disk file', function () {
        var runner = utils.getSetup(['test/fixtures/tasks/observable.js'], {});
        assert.equal(runner.sequence.length, 2); // 2 exported functions
    });
    it('Accepts single string for nested tasks', function () {
        var runner = utils.getSetup(['js'], {
            tasks: {
                js: 'test/fixtures/tasks/simple.js'
            }
        });
        assert.equal(runner.sequence.length, 1); // 2 exported functions
    });
    it('Accepts single string for multi nested tasks on disk', function () {
        var runner = utils.getSetup(['js'], {
            tasks: {
                js: 'js2',
                js2: 'js3',
                js3: 'js4',
                js4: 'test/fixtures/tasks/simple.js'
            }
        });
        assert.equal(runner.sequence.length, 1); // 1 exported functions
        assert.equal(runner.sequence[0].items[0].items[0].items[0].items[0].task.taskName, 'test/fixtures/tasks/simple.js');
        assert.deepEqual(runner.sequence[0].items[0].items[0].items[0].items[0].task.parents, ['js', 'js2', 'js3', 'js4']);
    });
    it('can combine files to form sequence', function () {
        const runner = utils.getSetup(['test/fixtures/tasks/simple.js', 'test/fixtures/tasks/simple2.js'], {});
        assert.equal(runner.sequence.length, 2);
    });
    it('can gather opts for sub tasks', function () {
        const runner = utils.getSetup(["test/fixtures/tasks/simple.js:dev"], {
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
        assert.equal(runner.sequence.length, 1);
        assert.equal(runner.sequence[0].subTaskName, 'dev');
    });
    it('can gather tasks when multi given in alias', function () {
        const runner = utils.getSetup(['js'], {
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

        assert.equal(runner.sequence[0].items[0].options.input, 'scss/main.scss');
        assert.equal(runner.sequence[0].items[0].options.output, 'css/main.min.css');

        assert.equal(runner.sequence[0].items[1].options.input, 'scss/core.scss');
        assert.equal(runner.sequence[0].items[1].options.output, 'css/core.css');
    });
    it('can gather tasks wth query-options', function () {
        const runner = utils.getSetup(['js'], {
            tasks: {
                js: ['test/fixtures/tasks/simple.js?input=app.js']
            },
            options: {}
        });

        assert.equal(runner.sequence[0].items[0].options.input, 'app.js');
    });
});
