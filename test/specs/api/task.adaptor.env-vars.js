const assert = require('chai').assert;
const cli = require("../../");

describe('Adaptor tasks + env vars', function () {
    it('@sh accepts top-level env option and merges that will task + process env' , function (done) {
        const runner = cli.getRunner(['js'], {
            env: {
                __SLEEP__: '0.1'
            },
            tasks: {
                js: {
                    adaptor: 'sh',
                    command: 'sleep $__SLEEP__'
                }
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function (xs) {
                assert.ok(xs.slice(-1)[0].stats.duration > 100);
                done();
            });
    });
    it('@npm accepts top-level env option and merges that will task + process env' , function (done) {
        const runner = cli.getRunner(['js'], {
            env: {
                __SLEEP__: '0.1'
            },
            tasks: {
                js: {
                    input: '@npm sleep $__SLEEP__'
                }
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function (xs) {
                assert.ok(xs.slice(-1)[0].stats.duration > 100);
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
                        __SLEEP__: '0.1'
                    }
                }
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function (xs) {
                assert.ok(xs.slice(-1)[0].stats.duration > 100);
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
                __SLEEP__: '0.1'
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function (xs) {
                assert.ok(xs.slice(-1)[0].stats.duration > 100);
                assert.ok(xs.slice(-1)[0].stats.duration < 2000);
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
                __SLEEP__: '0.1'
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function (xs) {
                assert.ok(xs.slice(-1)[0].stats.duration > 100);
                assert.ok(xs.slice(-1)[0].stats.duration < 200);
                done();
            });
    });
});
