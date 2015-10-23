var assert = require('chai').assert;
var watch = require('../lib/command.watch');
var cwd = require('path').resolve('test/fixtures');
var current = process.cwd();
var resolve = require('path').resolve;
var getBsConfig = require('../lib/utils').getBsConfig;
var cli = require("../cli");

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
    it('can handoff through --handoff with tasks that have multi steps', function (done) {
    	var runner = handoff(["test/fixtures/tasks/stream.js"], {
            crossbow: {}
        });
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
        var runner = handoff(["test/fixtures/tasks/simplse.js"], {
            crossbow: {}
        });
        assert.equal(runner.tasks.invalid.length, 1);
    });
    it('can combine files to form sequence', function (done) {
        cli({
            input: ["run", "test/fixtures/tasks/simple.js", "test/fixtures/tasks/simple2.js"]
        }, {
            crossbow: {
                config: {
                    "test/fixtures/tasks/simple.js": {
                        "name": "shane"
                    }
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
            crossbow: {
                tasks: {
                    js: ["dummy"],
                    dummy: ["test/fixtures/tasks/simple.js", "test/fixtures/tasks/simple2.js"]
                }
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
        }, {}, function (err, output) {
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
        }, {}, function (err, output) {
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
        }, {}, function (err, output) {
            if (err) {
                return done(err);
            }
            assert.equal(output.tasks.valid.length, 1);
            done();
        })
    });
    it('can gather simple tasks', function (done) {
        testCase(["run", "test/fixtures/tasks/simple.js:dev", "test/fixtures/tasks/simple2.js"], {
            crossbow: {
                config: {
                    sass: {
                        default: {
                            input: "scss/scss/core.scss",
                            output: "css/scss/core.css"
                        },
                        "test/fixtures/tasks/simple.js": {
                            input: "scss/scss/core.scss",
                            output: "css/scss/core.min.css"
                        }
                    }
                }
            }
        }, function (err, output) {
            assert.equal(output.tasks.valid.length, 2);
            assert.equal(output.tasks.valid[0].subTasks.length, 1);
            assert.equal(output.tasks.valid[1].subTasks.length, 0);
            done();
        })
    });
    it('can gather opts for sub tasks', function (done) {
        testCase(["run", "test/fixtures/tasks/simple.js:dev"], {
            crossbow: {
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
    it('can gather tasks when multi give in alias', function (done) {

        testCase(["run", "js"], {
            crossbow: {
                tasks: {
                    js: ["test/fixtures/tasks/simple.js:dev", "test/fixtures/tasks/simple.js:shane:kittie"]
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
            }
        }, function (err, output) {
            if (err) {
                return done(err);
            }
            assert.equal(output.tasks.valid[0].tasks[0].subTasks[0], 'dev');
            assert.equal(output.tasks.valid[0].tasks[1].subTasks[0], 'shane');
            assert.equal(output.tasks.valid[0].tasks[1].subTasks[1], 'kittie');
            done();
        })
    });
    it('can gather tasks from multiple aliass', function (done) {

        testCase(["run", "css"], {
            crossbow: {
                tasks: {
                    css: ["js"],
                    js:  ["test/fixtures/tasks/simple.js:dev", "test/fixtures/tasks/simple.js:shane:kittie"]
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
            }
        }, function (err, output) {
            if (err) {
                return done(err);
            }

            assert.equal(output.sequence[0].opts.input, 'scss/main.scss');
            assert.equal(output.sequence[0].opts.output, 'css/main.min.css');
            assert.equal(output.sequence[1].task.subTasks[0], 'shane');
            assert.equal(output.sequence[1].task.subTasks[1], 'kittie');

            done();
        });
    });
    it('can gather handle no-tasks in config', function (done) {

        testCase(["run", "test/fixtures/tasks/simple.js"], {
            crossbow: {
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
            crossbow: {
                tasks: {
                    css: ['test/fixtures/tasks/simple.js', 'test/fixtures/tasks/simple2.js'],
                    js:  ['test/fixtures/tasks/simple.js']
                }
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
            crossbow: {
                tasks: {
                    "css": ['test/fixtures/tasks/simple.js:default', 'test/fixtures/tasks/simple.js:dev']
                },
                config: {
                    $: {
                        name: 'kittie'
                    },
                    root: '/user',
                    public: '{root}/public',
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
                            input: '{public}/css',
                            output: '{public}/dist/css',
                            random: '{nested.props}/js',
                            joke: '{nested.arr.0.another}',
                            animal: '{$.name}'
                        },
                        dev: {
                            input: '{root}/css',
                            output: '{root}/dist/css'
                        }
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