const assert = require('chai').assert;
const cli = require("../");

function testCase (command, input, cb) {
    cli({input: command}, input, cb);
}

function handoff (cmd, input, cb) {
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

        assert.equal(runner.sequence[0].sequenceTasks.length, 1);
        assert.equal(runner.tasks.valid[0].taskName, '@npm ls');
        assert.equal(runner.tasks.valid[0].command, 'ls');
    });
    it('Accepts single string for on-disk file', function () {
    	var runner = handoff(['test/fixtures/tasks/observable.js'], {});
        assert.equal(runner.sequence[0].sequenceTasks.length, 2); // 2 exported functions
    });
    it('Accepts single string for nested tasks', function () {
    	var runner = handoff(['js'], {
            tasks: {
                js: 'test/fixtures/tasks/simple.js'
            }
        });
        assert.equal(runner.sequence[0].sequenceTasks.length, 1); // 2 exported functions
    });
    it('Accepts single string for multi nested tasks on disk', function () {
    	var runner = handoff(['js'], {
            tasks: {
                js: 'js2',
                js2: 'js3',
                js3: 'js4',
                js4: 'test/fixtures/tasks/simple.js'
            }
        });
        assert.equal(runner.sequence[0].sequenceTasks.length, 1); // 1 exported functions
        assert.equal(runner.sequence[0].task.taskName, 'test/fixtures/tasks/simple.js');
        assert.deepEqual(runner.sequence[0].task.parents, ['js', 'js2', 'js3', 'js4']);
    });
    it('Accepts single string for multi nested adaptor tasks', function () {
    	var runner = handoff(['js'], {
            tasks: {
                js: 'js2',
                js2: '@npm tsc src/*.ts --module commonjs --outDir dist'
            }
        });
        assert.equal(runner.sequence[0].sequenceTasks.length, 1); // 1 exported functions
        assert.equal(runner.sequence[0].task.taskName, '@npm tsc src/*.ts --module commonjs --outDir dist');
        assert.equal(runner.sequence[0].task.adaptor, 'npm');
        assert.equal(runner.sequence[0].task.rawInput, '@npm tsc src/*.ts --module commonjs --outDir dist');
        assert.equal(runner.sequence[0].task.command, 'tsc src/*.ts --module commonjs --outDir dist');
        assert.deepEqual(runner.sequence[0].task.parents, ['js', 'js2']);
    });
    it('can combine files to form sequence', function () {
        const runner = handoff(['test/fixtures/tasks/simple.js', 'test/fixtures/tasks/simple2.js']);
        assert.equal(runner.sequence.length, 2);
        assert.equal(runner.sequence[0].sequenceTasks.length, 1);
        assert.equal(runner.sequence[1].sequenceTasks.length, 1);
    });
    it('can combine files to form sequence from alias', function () {
        const runner = handoff(["js", "test/fixtures/tasks/stream.js"],{
            tasks: {
                js: ["dummy"],
                dummy: ["test/fixtures/tasks/simple.js", "test/fixtures/tasks/simple2.js"]
            }
        });

        assert.equal(runner.sequence[0].sequenceTasks.length, 1);
        assert.equal(runner.sequence[0].sequenceTasks[0].FUNCTION.name, 'simple');
        assert.equal(runner.sequence[1].sequenceTasks.length, 1);
        assert.equal(runner.sequence[1].sequenceTasks[0].FUNCTION.name, 'simple2');
        assert.equal(runner.sequence[2].sequenceTasks.length, 2);
    });
    it('can gather from external config file', function () {
        const runner = cli({
            input: ["run", "js"],
            flags: {config: "examples/crossbow.js", handoff: true}
        });

        assert.equal(runner.tasks.valid.length, 1);
        assert.equal(runner.tasks.valid[0].taskName, 'js');
        assert.equal(runner.tasks.valid[0].tasks[0].taskName, 'test/fixtures/tasks/simple.js');
        assert.equal(runner.sequence[0].sequenceTasks.length, 1);
        assert.deepEqual(runner.sequence[0].task.parents, ['js']);
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

    // TODO Continue refactoring tests for new ts implementation
    it.only('can gather simple tasks', function () {
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

        assert.equal(runner.tasks.valid.length, 1);
        assert.equal(runner.tasks.valid[0].subTasks.length, 1);
    });
    it('can gather opts for sub tasks', function (done) {
        testCase(["run", "test/fixtures/tasks/simple.js:dev"], {
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
        }, function (err, output) {
            if (err) {
                return done(err);
            }
            assert.equal(output.sequence[0].seq.taskItems.length, 1);
            assert.equal(output.sequence[0].opts.input, 'scss/main.scss');
            assert.equal(output.sequence[0].opts.output, 'css/main.min.css');
            done();
        })
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

        assert.equal(runner.tasks.valid[0].tasks[0].taskName, 'test/fixtures/tasks/simple.js');
        assert.equal(runner.tasks.valid[0].tasks[1].subTasks[0], 'default');
    });
    it('can gather tasks from multiple alias', function () {
        const runner = cli({
            input: ['run', 'css'],
            flags: {handoff: true}
        }, {
            tasks: {
                css: ['js'],
                js:  ['test/fixtures/tasks/simple.js:dev', 'test/fixtures/tasks/simple.js:dev:default']
            },
            config: {
                'test/fixtures/tasks/simple.js': {
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

        assert.equal(runner.sequence[0].opts.input, 'scss/main.scss');
        assert.equal(runner.sequence[0].opts.output, 'css/main.min.css');
        assert.equal(runner.sequence[1].task.subTasks[0], 'dev');
        assert.equal(runner.sequence[1].task.subTasks[1], 'default');
    });
    it('can gather handle no-tasks in config', function (done) {

        testCase(["run", "test/fixtures/tasks/simple.js"], {
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
        }, function (err, output) {
            if (err) {
                return done(err);
            }

            assert.equal(output.sequence.length, 1);
            assert.equal(output.sequence[0].opts.default.input, 'scss/core.scss');
            assert.equal(output.sequence[0].opts.default.output, 'css/core.css');

            done();
        });
    });
    it('can gather valid tasks when using an alias', function (done) {
        testCase(["run", "css", "js"], {
            tasks: {
                css: ['test/fixtures/tasks/simple.js', 'test/fixtures/tasks/simple2.js'],
                js:  ['test/fixtures/tasks/simple.js']
            }
        }, function (err, output) {

            var first = output.tasks.valid[0];

            assert.equal(first.taskName, 'css');
            assert.equal(first.modules.length, 0);
            assert.equal(first.tasks.length, 2);
            assert.equal(first.tasks[0].tasks.length, 0);
            assert.equal(first.tasks[0].taskName, 'test/fixtures/tasks/simple.js');
            assert.equal(first.tasks[1].taskName, 'test/fixtures/tasks/simple2.js');
            done();
        })
    });
    it('can process config options with {} replacements', function (done) {
        testCase(["run", "css"], {
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
        }, function (err, output) {

            assert.equal(output.sequence[0].opts.input, '/user/public/css');
            assert.equal(output.sequence[0].opts.output, '/user/public/dist/css');
            assert.equal(output.sequence[0].opts.random, 'no-problem/js');
            assert.equal(output.sequence[0].opts.joke,  'shane');
            assert.equal(output.sequence[0].opts.animal,  'kittie');

            assert.equal(output.sequence[1].opts.output, '/user/dist/css');
            assert.equal(output.sequence[1].opts.output, '/user/dist/css');
            done();
        })
    });
});
