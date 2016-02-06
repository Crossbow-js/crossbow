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
    it.only('Accepts single string', function () {

    	var runner = handoff(['list'], {
            tasks: {
                list: 'test/fixtures/tasks/observable.js'
            }
        });

        console.log(runner);
        //assert.equal(runner.sequence[0].seq.taskItems.length, 1);
        //assert.equal(runner.tasks.valid[0].tasks[0].taskName, 'ls');
        //assert.equal(runner.tasks.valid[0].tasks[0].compat, 'npm');
    });
    it('can handoff through --handoff with tasks that have multi steps', function (done) {
    	var runner = handoff(["test/fixtures/tasks/stream.js"]);
        runner.run.subscribe(function () {}, function (err) {
        	console.log(err);
        }, function () {
            assert.equal(runner.sequence[0].seq.taskItems.length, 2);
            assert.isTrue(runner.sequence[0].seq.taskItems[0].completed);
            assert.isNumber(runner.sequence[0].seq.taskItems[0].startTime);
            assert.isNumber(runner.sequence[0].seq.taskItems[0].endTime);
            assert.isNumber(runner.sequence[0].seq.taskItems[0].duration);
            assert.isTrue(runner.sequence[0].seq.taskItems[0].duration > 0);
        	done();
        });
    });
    it('can handoff through --handoff', function (done) {
    	var runner = handoff(["test/fixtures/tasks/simple.js", "test/fixtures/tasks/simple2.js"], {
            crossbow: {}
        });
        runner.run.subscribe(function () {}, function (err) {
        	console.log(err);
        }, function () {

            assert.isTrue(runner.sequence[0].seq.taskItems[0].completed);
            assert.isNumber(runner.sequence[0].seq.taskItems[0].startTime);
            assert.isNumber(runner.sequence[0].seq.taskItems[0].endTime);
            assert.isNumber(runner.sequence[0].seq.taskItems[0].duration);
            assert.isTrue(runner.sequence[1].seq.taskItems[0].completed);
            assert.isNumber(runner.sequence[1].seq.taskItems[0].startTime);
            assert.isNumber(runner.sequence[1].seq.taskItems[0].endTime);
            assert.isNumber(runner.sequence[1].seq.taskItems[0].duration);
        	done();
        });
        assert.equal(runner.tasks.valid.length, 2);
    });
    it('can handle error after handing off', function () {
        var runner = handoff(["test/fixtures/tasks/simplse.js"]);
        assert.equal(runner.tasks.invalid.length, 1);
    });
    it('can combine files to form sequence', function (done) {
        cli({
            input: ['run', 'test/fixtures/tasks/simple.js', 'test/fixtures/tasks/simple2.js']
        }, {
            config: {
                'test/fixtures/tasks/simple.js': {
                    'name': 'shane'
                }
            }
        }, function (err, output) {
            assert.equal(output.sequence.length, 2);
            assert.equal(output.sequence[0].seq.taskItems.length, 1);
            assert.equal(output.sequence[0].opts.name, "shane");
            done();
        });
    });
    it('can combine files to form sequence from alias', function (done) {
        cli({
            input: ["run", "js", "test/fixtures/tasks/stream.js"]
        }, {
            tasks: {
                js: ["dummy"],
                dummy: ["test/fixtures/tasks/simple.js", "test/fixtures/tasks/simple2.js"]
            }
        }, function (err, output) {
            assert.equal(output.sequence[0].seq.taskItems.length, 1);
            assert.equal(output.sequence[0].seq.taskItems[0].FUNCTION.name, 'simple');
            assert.equal(output.sequence[1].seq.taskItems.length, 1);
            assert.equal(output.sequence[1].seq.taskItems[0].FUNCTION.name, 'simple2');
            assert.equal(output.sequence[2].seq.taskItems.length, 2);
            done();
        });
    });
    it('can gather from external config file', function (done) {
        cli({
            input: ["run", "js"],
            flags: {config: "examples/crossbow.js"}
        }, null, function (err, output) {
            if (err) {
                return done(err);
            }
            assert.equal(output.tasks.valid.length, 1);
            assert.equal(output.tasks.valid[0].subTasks.length, 0);
            done();
        })
    });
    it('can gather from external config file via flag', function (done) {
        cli({
            input: ["run", "my-awesome-task"],
            flags: {
                config: 'examples/crossbow-alt.js'
            }
        }, null, function (err, output) {
            if (err) {
                return done(err);
            }
            assert.equal(output.tasks.valid.length, 1);
            assert.equal(output.tasks.valid[0].subTasks.length, 0);
            assert.equal(output.tasks.valid[0].tasks.length, 2);
            assert.equal(output.tasks.valid[0].tasks[0].tasks.length, 0);
            assert.equal(output.tasks.valid[0].tasks[1].tasks.length, 0);
            done();
        })
    });
    it('can gather from default yaml file', function (done) {
        cli({
            input: ["run", "js"],
            flags: {
                config: 'examples/crossbow.yaml'
            }
        }, null, function (err, output) {
            if (err) {
                return done(err);
            }
            assert.equal(output.tasks.valid.length, 1);
            done();
        })
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
    it('can process config options ith {} replacements', function (done) {
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
