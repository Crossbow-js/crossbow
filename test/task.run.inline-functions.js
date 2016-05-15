const assert = require('chai').assert;
const cli = require("../");
const TaskErrorTypes = require('../dist/task.errors').TaskErrorTypes;

describe('Running tasks from inline-functions', function () {
    it('with single inline function', function (done) {
        var called = 0;
        const runner = cli.getRunner(['js --shane'], {
            tasks: {
                js: function (options, context, done) {
                    called += 1;
                    done();
                }
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                // console.log('assert');
                // assert.equal(called, 1);
                done();
            });
    });
    it('with multiple inline functions', function (done) {
        var called = 0;
        const runner = cli.getRunner(['js --shane', 'js --kittie', 'js'], {
            tasks: {
                js: function (options, context, done) {
                    called += 1;
                    done();
                }
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.equal(called, 3);
                done();
            });
    });
    it('passes options into inline functions', function (done) {
        const opts = [];
        const runner = cli.getRunner(['js --name=shane --production', 'js?name=kittie'], {
            tasks: {
                js: function (options, context, done) {
                    opts.push(options);
                    done();
                }
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.equal(opts[0].name, 'shane');
                assert.equal(opts[0].production, true);

                assert.equal(opts[1].name, 'kittie');
                assert.isUndefined(opts[1].production);
                done();
            });
    });
    it('passes options from options', function (done) {
        const opts = [];
        const runner = cli.getRunner(['js:dev:kittie --production'], {
            options: {
                js: {
                    dev: {
                        input: "src/app.js"
                    },
                    kittie: {
                        input: "src/app2.js"
                    }
                }
            },
            tasks: {
                js: function (options, context, done) {
                    opts.push(options);
                    done();
                }
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.equal(opts[0].input, 'src/app.js');
                assert.equal(opts[0].production, true);
                assert.equal(opts[1].input, 'src/app2.js');
                assert.equal(opts[1].production, true);
                done();
            });
    });
    it('Allows errors when options not defined options ', function () {
        const opts = [];
        const runner = cli.getRunner(['js:dev:typo --production'], {
            options: {
                js: {
                    dev: {
                        input: "src/app.js"
                    }
                }
            },
            tasks: {
                js: function (options, context, done) {
                    opts.push(options);
                    done();
                }
            }
        });
        assert.equal(runner.tasks.invalid[0].errors[0].type, TaskErrorTypes.SubtaskNotFound);
    });
});
