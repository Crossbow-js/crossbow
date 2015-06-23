var assert      = require('chai').assert;
var cli         = require('../');
var watch       = require('../lib/command.watch');
var cwd         = require('path').resolve('test/fixtures');
var current     = process.cwd();
var gather      = require('../lib/gather-tasks');
var getBsConfig = require('../lib/utils').getBsConfig;

describe('Running watcher and tasks', function () {
    it('can add watchers from individual tasks', function (done) {
        cli({input: ['watch', 'someother']}, {
            pkg: {
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
            pkg: {
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
    it.skip('can add watchers fire a watch event', function (done) {
        cli({input: ['watch']}, {
            pkg: {
                crossbow: {
                    watch: {
                        "bs-config": {
                            logLevel: 'silent',
                            open: false
                        },
                        tasks: {
                            "other": {
                                "app/**/*.js": ["task.js"],
                                "app/**/*.css": ["postcss"]
                            },
                            "default": {
                                "app/other/*.js": ["babel2"],
                                "app/other/*.css": ["postcss"]
                            }
                        }
                    }
                }
            },
            cb: function (err, out) {
                process.env['TEST'] = 'true';
                watch.runCommandAfterWatch(out.tasks[0], out.opts, 'change', 'app/main.js')
                    .then(function (output) {
                        //assert.equal(output.ctx.trigger.task.patterns[0],  'app/**/*.js');
                        assert.equal(output.ctx.trigger.task.tasks[0],     'task.js');
                        assert.equal(output.ctx.trigger.type,  'watcher');
                        assert.equal(output.ctx.trigger.file,  'app/main.js');
                        assert.equal(output.ctx.trigger.event, 'change');

                        assert.equal(output.message, 'task 1 completed');

                        out.bs.cleanup();
                        done();
                    }).done();
            }
        });
    });
});