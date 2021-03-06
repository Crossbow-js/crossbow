const assert = require('chai').assert;
const utils = require("../../utils");
const TaskErrorTypes = require('../../../dist/task.errors').TaskErrorTypes;

describe('Running tasks from inline-functions', function () {
    it('with single inline function', function (done) {
        var called = 0;
        const runner = utils.getRunner(['js --shane'], {
            tasks: {
                js: function (options, context, done) {
                    called += 1;
                    done();
                }
            }
        });
        runner
            .toArray()
            .subscribe(function () {
                // console.log('assert');
                // assert.equal(called, 1);
                done();
            });
    });
    it('with multiple inline functions', function (done) {
        var called = 0;
        const runner = utils.getRunner(['js --shane', 'js --kittie', 'js'], {
            tasks: {
                js: function (options, context, done) {
                    called += 1;
                    done();
                }
            }
        });
        runner
            .toArray()
            .subscribe(function () {
                assert.equal(called, 3);
                done();
            });
    });
    it('passes options into inline functions', function (done) {
        const opts = [];
        const runner = utils.getRunner(['js --name=shane --production', 'js?name=kittie'], {
            tasks: {
                js: function (options, context, done) {
                    opts.push(options);
                    done();
                }
            }
        });
        runner
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
        const runner = utils.getRunner(['js:dev:kittie --production'], {
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
        runner
            .toArray()
            .subscribe(function () {
                assert.equal(opts[0].input, 'src/app.js');
                assert.equal(opts[0].production, true);
                assert.equal(opts[1].input, 'src/app2.js');
                assert.equal(opts[1].production, true);
                done();
            });
    });
    it('passes options from inline object', function (done) {
        const opts = [];
        const runner = utils.getRunner(['js'], {
            tasks: {
                js: {
                    options: {
                        dev: {
                            input: 'kittie'
                        },
                        prod: {
                            input: 'sally'
                        }
                    },
                    runMode: 'parallel',
                    tasks: [
                        function (options) {
                            opts.push(options);
                        },
                        'css'
                    ]
                },
                css: function (options) {
                    opts.push(options);
                }
            }
        });
        runner
            .toArray()
            .subscribe(function () {
                assert.equal(opts[0].dev.input,  'kittie', 'first JS "dev" task');
                assert.equal(opts[0].prod.input, 'sally', 'first JS "dev" task');
                assert.deepEqual(opts[1],  {}, 'first CSS task');
                done();
            });
    });
    it('passes options from inline object with sub tasks', function (done) {
        const opts = [];
        const runner = utils.getRunner(['js:dev:prod'], {
            tasks: {
                js: {
                    options: {
                        dev: {
                            input: 'kittie'
                        },
                        prod: {
                            input: 'sally'
                        }
                    },
                    runMode: 'parallel',
                    tasks: [
                        function (options) {
                            opts.push(options);
                        },
                        'css'
                    ]
                },
                css: function (options) {
                    opts.push(options);
                }
            }
        });
        runner
            .toArray()
            .subscribe(function () {
                assert.equal(opts[0].input, 'kittie', 'first JS "dev" task');
                assert.deepEqual(opts[1], {}, 'first CSS task');
                assert.equal(opts[2].input, 'sally',  'second JS "prod" task');
                assert.deepEqual(opts[3], {}, 'second CSS task');
                done();
            });
    });
    it('passes options from inline object with sub task wildcard', function (done) {
        const opts = [];
        const runner = utils.getRunner(['js:*'], {
            tasks: {
                js: {
                    options: {
                        dev: {
                            input: 'kittie'
                        },
                        prod: {
                            input: 'sally'
                        }
                    },
                    runMode: 'series',
                    tasks: [
                        function (options) {
                            opts.push(options);
                        },
                        'css'
                    ]
                },
                css: function (options) {
                    opts.push(options);
                }
            }
        });
        runner
            .toArray()
            .subscribe(function () {
                assert.equal(opts[0].input, 'kittie', 'first JS "dev" task');
                assert.deepEqual(opts[1], {}, 'first CSS task');
                assert.equal(opts[2].input, 'sally',  'second JS "prod" task');
                assert.deepEqual(opts[3], {}, 'second CSS task');
                done();
            });
    });
    it('Allows errors when options not defined options ', function () {
        const opts = [];
        const runner = utils.getSetup(['js:dev:typo --production'], {
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
