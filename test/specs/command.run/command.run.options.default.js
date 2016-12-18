const assert = require('chai').assert;
const utils = require("../../utils");

describe('Adding options from _default ket', function () {
    it('passes _default options when a sub-task is used in task', function (done) {
        const opts = [];
        const runner = utils.getRunner(['js:dev'], {
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
        runner
            .toArray()
            .subscribe(function () {
                assert.equal(opts[0].input,  'kittie');
                assert.equal(opts[0].output, 'app/css');
                done();
            });
    });
    it('passes _default options when a subtask wildcard used', function (done) {
        const opts = [];
        const runner = utils.getRunner(['js:*'], {
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
        runner
            .toArray()
            .subscribe(function () {
                assert.equal(opts.length, 2);
                done();
            });
    });
    it('passes _default options when a subtask is used in group', function (done) {
        const opts = [];
        const runner = utils.getRunner(['js:dev'], {
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
        runner
            .toArray()
            .subscribe(function () {
                assert.equal(opts[0].input,  'kittie');
                assert.equal(opts[0].output, 'app/css');
                assert.deepEqual(opts[1], {});
                done();
            });
    });
    it('passes _default options when wildcard used in group', function (done) {
        const opts = [];
        const runner = utils.getRunner(['js:*'], {
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
        runner
            .toArray()
            .subscribe(function () {
                assert.equal(opts.length, 4);
                assert.equal(opts[0].input,  'kittie');
                assert.equal(opts[0].output, 'app/css');
                assert.deepEqual(opts[1],  {});
                done();
            });
    });
    it('passes flags to groups', function (done) {
        const opts = [];
        const runner = utils.getRunner(['js:dev --production'], {
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
        runner
            .toArray()
            .subscribe(function () {
                assert.equal(opts.length, 2);
                assert.equal(opts[0].input,  'kittie');
                assert.equal(opts[0].output, 'app/css');
                assert.equal(opts[0].production, true);
                assert.deepEqual(opts[1],  {});
                done();
            });
    });
    it('allows correct order of precedence with mixed inputs/options', function (done) {
        const opts = [];
        const runner = utils.getRunner(['js:dev --input=app/js', 'js:prod?input=./tmp', 'css:dev'], {
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
                css: {
                    description: 'css',
                    options: {
                        prod: {input: 'input.scss'},
                        dev: {input: 'input-dev.scss'}
                    },
                    tasks: function (options) {
                        opts.push(options);
                    }
                }
            }
        });
        runner
            .toArray()
            .subscribe(function () {
                assert.deepEqual(opts, [
                    { output: 'app/css', input: 'app/js' },
                    { prod: { input: 'input.scss' }, dev: { input: 'input-dev.scss' } },
                    { output: 'app/css', input: './tmp' },
                    { prod: { input: 'input.scss' }, dev: { input: 'input-dev.scss' } },
                    { input: 'input-dev.scss' }
                ]);
                done();
            });
    });
    it('creates single task when Group item has default options', function (done) {
        const opts = [];
        const runner = utils.getRunner(['js'], {
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
        runner
            .toArray()
            .subscribe(function () {

                assert.equal(opts.length, 2);

                assert.equal(opts[0].input, 'app/scss/core.scss', 'default input');
                assert.equal(opts[0].output, 'app/css', 'default output');

                done();
            });
    });
    it('creates single task when item has default options', function (done) {
        const opts = [];
        const runner = utils.getRunner(['js'], {
            tasks: {
                js: function (options) {
                    opts.push(options);
                }
            },
            options: {
                js: {
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
                }
            }
        });
        runner
            .toArray()
            .subscribe(function () {

                assert.equal(opts.length, 1);

                assert.equal(opts[0].input, 'app/scss/core.scss', 'default input');
                assert.equal(opts[0].output, 'app/css', 'default output');

                done();
            });
    });
});
