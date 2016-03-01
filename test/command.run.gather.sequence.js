const assert = require('chai').assert;
const cli = require("../");

describe('Gathering run tasks', function () {
    it('Accepts single string for on-disk file', function () {
        var runner = cli.getRunner(['test/fixtures/tasks/observable.js'], {});
        assert.equal(runner.sequence.length, 2); // 2 exported functions
    });
    it('Accepts single string for nested tasks', function () {
        var runner = cli.getRunner(['js'], {
            tasks: {
                js: 'test/fixtures/tasks/simple.js'
            }
        });
        assert.equal(runner.sequence.length, 1); // 2 exported functions
    });
    it('Accepts single string for multi nested tasks on disk', function () {
        var runner = cli.getRunner(['js'], {
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
        const runner = cli.getRunner(['test/fixtures/tasks/simple.js', 'test/fixtures/tasks/simple2.js'], {});
        assert.equal(runner.sequence.length, 2);
    });
    it('can gather opts for sub tasks', function () {
        const runner = cli.getRunner(["test/fixtures/tasks/simple.js:dev"], {
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
        assert.equal(runner.sequence.length, 1);
        assert.equal(runner.sequence[0].subTaskName, 'dev');
    });
    it('can gather tasks when multi given in alias', function () {
        const runner = cli.getRunner(['js'], {
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

        assert.equal(runner.sequence[0].items[0].config.input, 'scss/main.scss');
        assert.equal(runner.sequence[0].items[0].config.output, 'css/main.min.css');

        assert.equal(runner.sequence[0].items[1].config.input, 'scss/core.scss');
        assert.equal(runner.sequence[0].items[1].config.output, 'css/core.css');
    });
    it('can gather tasks wth query-config', function () {
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: ['test/fixtures/tasks/simple.js?input=app.js']
            },
            config: {}
        });

        assert.equal(runner.sequence[0].items[0].config.input, 'app.js');
    });
    it.skip('can process config options with {} replacements', function () {
        const runner = cli({
            input: ["run", "css"],
            flags: {handoff: true}
        }, {
            tasks: {
                "css": ['test/fixtures/tasks/simple.js:default', 'test/fixtures/tasks/simple.js:dev']
            },
            config: {
                $: {
                    name: 'kittie'
                },
                root: '/user',
                public: '{{root}}/public',
                nested: {
                    props: 'no-problem',
                    arr: [
                        {
                            another: 'shane'
                        }
                    ]
                },
                'test/fixtures/tasks/simple.js': {
                    default: {
                        input: '{{public}}/css',
                        output: '{{public}}/dist/css',
                        random: '{{nested.props}}/js',
                        joke: '{{nested.arr.0.another}}',
                        animal: '{{$.name}}'
                    },
                    dev: {
                        input: '{{root}}/css',
                        output: '{{root}}/dist/css'
                    }
                }
            }
        });

        assert.equal(runner.sequence[0].opts.input, '/user/public/css');
        assert.equal(runner.sequence[0].opts.output, '/user/public/dist/css');
        assert.equal(runner.sequence[0].opts.random, 'no-problem/js');
        assert.equal(runner.sequence[0].opts.joke, 'shane');
        assert.equal(runner.sequence[0].opts.animal, 'kittie');

        assert.equal(runner.sequence[1].opts.output, '/user/dist/css');
        assert.equal(runner.sequence[1].opts.output, '/user/dist/css');
    });
});
