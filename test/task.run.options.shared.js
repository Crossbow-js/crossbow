const assert = require('chai').assert;
const cli = require("../");

describe('Adding options from _default ket', function () {
    it('passes _default options when a sub-task is used in task', function (done) {
        const opts = [];
        const runner = cli.getRunner(['js:dev'], {
            tasks: {
                js: function (options) {
                    opts.push(options);
                }
            },
            options: {
                js: {
                    _default: {
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
    it('passes _default options when a subtask wildcard used', function (done) {
        const opts = [];
        const runner = cli.getRunner(['js:*'], {
            tasks: {
                js: function (options) {
                    opts.push(options);
                }
            },
            options: {
                js: {
                    _default: {
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
    it('passes _default options when a subtask is used in group', function (done) {
        const opts = [];
        const runner = cli.getRunner(['js:dev'], {
            tasks: {
                js: {
                    options: {
                        _default: {
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
    it('passes _default options when wildcard used in group', function (done) {
        const opts = [];
        const runner = cli.getRunner(['js:*'], {
            tasks: {
                js: {
                    options: {
                        _default: {
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
    it('passes flags to groups', function (done) {
        const opts = [];
        const runner = cli.getRunner(['js:dev --production'], {
            tasks: {
                js: {
                    options: {
                        _default: {
                            output: 'app/css'
                        },
                        dev: {
                            input: 'kittie'
                        },
                        prod: {
                            input: 'sally'
                        }
                    },
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
                assert.equal(opts.length, 2);
                assert.equal(opts[0].input,  'kittie');
                assert.equal(opts[0].output, 'app/css');
                assert.equal(opts[0].production, true);
                assert.equal(opts[1].input,  'kittie');
                assert.equal(opts[1].output, 'app/css');
                assert.equal(opts[1].production, true);
                done();
            });
    });
    it('allows correct order of precedence with mixed inputs/options', function (done) {
        const opts = [];
        const runner = cli.getRunner(['js:dev --input=app/js', 'js:prod?input=./tmp'], {
            tasks: {
                js: {
                    options: {
                        _default: {
                            output: 'app/css'
                        },
                        dev: {
                            input: 'kittie'
                        },
                        prod: {
                            input: 'sally'
                        }
                    },
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
                assert.equal(opts[0].input,  'app/js',  'overridden by flag');
                assert.equal(opts[0].output, 'app/css', 'derived from shared prop');
                assert.equal(opts[1].input,  'app/js',  'default');
                assert.equal(opts[1].output, 'app/css', 'from shared');

                assert.equal(opts[2].input,  './tmp',  'default from option');
                assert.equal(opts[2].output, 'app/css', 'derived from shared prop');

                done();
            });
    });
    it('creates single task when Group item has default options', function (done) {
        const opts = [];
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: {
                    options: {
                        _default: {
                            output: 'app/css',
                            input: 'app/scss/core.scss'
                        },
                        dev: {
                            input: 'kittie'
                        },
                        prod: {
                            input: 'sally'
                        }
                    },
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

                assert.equal(opts.length, 2);

                assert.equal(opts[0].input, 'app/scss/core.scss', 'default input');
                assert.equal(opts[0].output, 'app/css', 'default output');

                done();
            });
    });
});
