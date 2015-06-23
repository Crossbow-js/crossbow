var assert      = require('chai').assert;
var watch       = require('../');
var cwd         = require('path').resolve('test/fixtures');
var current     = process.cwd();
var gather      = require('../lib/gather-tasks');
var getBsConfig = require('../lib/utils').getBsConfig;

describe('Running watcher and tasks', function () {
    it('can add watchers from individual tasks', function (done) {
        watch({input: ['watch', 'someother']}, {
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
        watch({input: ['watch']}, {
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
                out.bs.cleanup();
                done();
            }
        });
    });
    it.only('can add watchers fire a watch event', function (done) {
        watch({input: ['watch']}, {
            pkg: {
                crossbow: {
                    watch: {
                        "bs-config": {
                            logLevel: 'silent',
                            open: false
                        },
                        tasks: {
                            "**/*.js": "babel"
                        }
                    }
                }
            },
            cb: function (err, out) {
                assert.equal(out.tasks.length, 1);
                out.bs.watchers.core.watchers[0]._events.all('change', 'app.js');
                out.bs.cleanup();
                done();
            }
        });
    });
});