var assert = require('chai').assert;
var cli = require('../');
var resolve = require('path').resolve;
var watch = require('../lib/command.watch');
var sinon = require('sinon');

describe('Running watcher and tasks', function () {
    beforeEach(function () {
        if (process.env['TEST']) {
            delete process.env['TEST'];
        }
    });
    it('can add watchers from individual tasks', function (done) {
        cli({input: ['watch', 'someother']}, {
            crossbow: {
                watch: {
                    "bs-config": {
                        logLevel: 'silent',
                        open: false
                    },
                    "someother": [
                        {
                            "app/**/*.js": "babel2",
                            "app/**/*.css": "postcss"
                        }
                    ]
                }
            },
            cb: function (err, out) {
                assert.equal(out.tasks.length, 2);
                assert.equal(out.bs.watchers.core.watchers.length, 2);
                out.bs.cleanup();
                done();
            }
        });
    });
    it('can add watchers from all tasks', function (done) {
        cli({input: ['watch']}, {
            crossbow: {
                watch: {
                    "bs-config": {
                        logLevel: 'silent',
                        open: false
                    },
                    tasks: {
                        "other": {
                            "app/**/*.js": ["babel2"],
                            "app/**/*.css": ["postcss"]
                        },
                        "default": {
                            "app/other/*.js": ["babel2"],
                            "app/other/*.css": ["postcss"]
                        }
                    }
                }
            },
            cb: function (err, out) {
                assert.equal(out.tasks.length, 4);
                assert.equal(out.tasks[0].patterns[0], 'app/**/*.js');
                out.bs.cleanup();
                done();
            }
        });
    });
    it('can add watchers fire a watch event', function (done) {
        cli({input: ['watch']}, {
            crossbow: {
                watch: {
                    "bs-config": {
                        logLevel: 'silent',
                        open: false
                    },
                    tasks: {
                        "other": {
                            "app/**/*.js": ["test/fixtures/task.js as eslint"],
                            "app/**/*.css": ["postcss"]
                        },
                        "default": {
                            "app/other/*.js": ["babel2"],
                            "app/other/*.css": ["postcss"]
                        }
                    }
                },
                config: {
                    sass: {
                        input: 'test/fixtures/scss/main.scss'
                    },
                    eslint: {
                        input: 'test/fixtures/js/**'
                    }
                }
            },
            cb: function (err, out) {
                process.env['TEST'] = 'true';
                watch.runCommandAfterWatch(out.tasks[0], out.opts, 'change', 'app/main.js')
                    .then(function (output) {
                        assert.equal(output.ctx.trigger.task.patterns[0], 'app/**/*.js');
                        assert.equal(output.ctx.trigger.task.tasks[0], 'test/fixtures/task.js as eslint');
                        assert.equal(output.ctx.trigger.type, 'watcher');
                        assert.equal(output.ctx.trigger.file, 'app/main.js');
                        assert.equal(output.ctx.trigger.event, 'change');
                        assert.equal(output.message, 'task 1 completed');
                        assert.equal(resolve('test/fixtures/scss/main.scss'), output.ctx.path.make('sass.input'));
                        out.bs.cleanup();
                        done();
                    }).done();
            }
        });
    });
    it('can call browser-sync api method with bs:<method> syntax', function (done) {
        cli({input: ['watch']}, {
            crossbow: {
                watch: {
                    "bs-config": {
                        logLevel: 'silent',
                        open: false
                    },
                    tasks: {
                        "app/**/*.js": ["test/fixtures/task.js", "bs:reload"]
                    }
                }
            },
            cb: function (err, out) {
                var spy = sinon.spy(out.bs.publicInstance, 'reload');
                watch.runCommandAfterWatch.apply(out.bs.publicInstance, [
                    out.tasks[0], out.opts, 'change', 'app/main.js', function () {
                        sinon.assert.calledOnce(spy);
                        out.bs.cleanup();
                        done();
                    }
                ]);
            }
        });
    });
    it('can call browser-sync api method with bs:<method>:<args> syntax', function (done) {
        cli({input: ['watch']}, {
            crossbow: {
                watch: {
                    "bs-config": {
                        logLevel: 'silent',
                        open: false
                    },
                    tasks: {
                        "app/**/*.js": ["test/fixtures/task.js", "bs:reload:app.js"]
                    }
                }
            },
            cb: function (err, out) {
                var spy = sinon.spy(out.bs.publicInstance, 'reload');
                watch.runCommandAfterWatch.apply(out.bs.publicInstance, [
                    out.tasks[0], out.opts, 'change', 'app/main.js', function () {
                        sinon.assert.calledWithExactly(spy, 'app.js');
                        out.bs.cleanup();
                        done();
                    }
                ]);
            }
        });
    });
    it('can run browser-sync without any watch targets', function (done) {
        cli({input: ['watch']}, {
            crossbow: {
                watch: {
                    "bs-config": {
                        logLevel: 'silent',
                        open: false
                    }
                }
            },
            cb: function (err, out) {
                assert.isFunction(out.bs.publicInstance.reload);
                out.bs.cleanup();
                done();
            }
        });
    });
});