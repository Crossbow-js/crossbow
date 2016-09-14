const assert = require('chai').assert;
const cli = require("../../");
const TaskTypes = require("../../dist/task.resolve").TaskTypes;
const TaskRunModes = require("../../dist/task.resolve").TaskRunModes;
const SequenceItemTypes = require("../../dist/task.sequence.factories").SequenceItemTypes;

describe('Adaptor tasks + env vars', function () {
    it('@sh accepts top-level env option and merges that will task + process env' , function (done) {
        const runner = cli.getRunner(['js'], {
            env: {
                __SLEEP__: '0.3'
            },
            tasks: {
                js: {
                    adaptor: 'sh',
                    command: 'sleep $__SLEEP__'
                }
            }
        });
        var start = new Date().getTime();
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.ok(new Date().getTime() - start > 300);
                done();
            });
    });
    it('@npm accepts top-level env option and merges that will task + process env' , function (done) {
        const runner = cli.getRunner(['js'], {
            env: {
                __SLEEP__: '0.3'
            },
            tasks: {
                js: {
                    input: '@npm sleep $__SLEEP__'
                }
            }
        });
        var start = new Date().getTime();
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.ok(new Date().getTime() - start > 300);
                done();
            });
    });
    it('@sh task-specific vars override global' , function (done) {
        const runner = cli.getRunner(['js'], {
            env: {
                __SLEEP__: '2'
            },
            tasks: {
                js: {
                    input: '@npm sleep $__SLEEP__',
                    env: {
                        __SLEEP__: '0.3'
                    }
                }
            }
        });
        var start = new Date().getTime();
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.ok(new Date().getTime() - start > 300);
                assert.ok(new Date().getTime() - start < 2000);
                done();
            });
    });
    it('@npm CLI provided env vars override EVERYTHING else' , function (done) {
        const runner = cli.getRunner(['js'], {
            env: {
                __SLEEP__: '2'
            },
            tasks: {
                js: {
                    input: '@npm sleep $__SLEEP__',
                    env: {
                        __SLEEP__: '2'
                    }
                }
            }
        }, {
            // cli input
            env: {
                __SLEEP__: '0.3'
            }
        });
        var start = new Date().getTime();
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.ok(new Date().getTime() - start > 300);
                assert.ok(new Date().getTime() - start < 2000);
                done();
            });
    });
    it('@sh CLI provided env vars override EVERYTHING else' , function (done) {
        const runner = cli.getRunner(['js'], {
            env: {
                __SLEEP__: '2'
            },
            tasks: {
                js: {
                    adaptor: 'sh',
                    command: 'sleep $__SLEEP__',
                    env: {
                        __SLEEP__: '2'
                    }
                }
            }
        }, {
            // cli input
            env: {
                __SLEEP__: '0.3'
            }
        });
        var start = new Date().getTime();
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.ok(new Date().getTime() - start > 300);
                assert.ok(new Date().getTime() - start < 2000);
                done();
            });
    });
});
