const assert = require('chai').assert;
const cli = require("../");

describe('Adding options from _shared ket', function () {
    it('passes _shared options when a subtask is used in task', function (done) {
        const opts = [];
        const runner = cli.getRunner(['js:dev'], {
            tasks: {
                js: function (options) {
                    opts.push(options);
                }
            },
            options: {
                js: {
                    _shared: {
                        output: 'app/css'
                    },
                    dev: {
                        input: 'kittie'
                    },
                    prod: {
                        input: 'sally'
                    }
                }
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.equal(opts[0].input,  'kittie');
                assert.equal(opts[0].output, 'app/css');
                done();
            });
    });
    it('passes _shared options when a subtask wildcard used', function (done) {
        const opts = [];
        const runner = cli.getRunner(['js:*'], {
            tasks: {
                js: function (options) {
                    opts.push(options);
                }
            },
            options: {
                js: {
                    _shared: {
                        output: 'app/css'
                    },
                    dev: {
                        input: 'kittie'
                    },
                    prod: {
                        input: 'sally'
                    }
                }
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.equal(opts.length, 2);
                done();
            });
    });
    it('passes _shared options when a subtask is used in group', function (done) {
        const opts = [];
        const runner = cli.getRunner(['js:dev'], {
            tasks: {
                js: {
                    options: {
                        _shared: {
                            output: 'app/css'
                        },
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
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.equal(opts[0].input,  'kittie');
                assert.equal(opts[0].output, 'app/css');
                assert.equal(opts[1].input,  'kittie');
                assert.equal(opts[1].output, 'app/css');
                done();
            });
    });
    it('passes _shared options when wildcard used in group', function (done) {
        const opts = [];
        const runner = cli.getRunner(['js:*'], {
            tasks: {
                js: {
                    options: {
                        _shared: {
                            output: 'app/css'
                        },
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
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.equal(opts.length, 4);
                assert.equal(opts[0].input,  'kittie');
                assert.equal(opts[0].output, 'app/css');
                assert.equal(opts[1].input,  'kittie');
                assert.equal(opts[1].output, 'app/css');
                done();
            });
    });
});
