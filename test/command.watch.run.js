var assert      = require('chai').assert;
var watch       = require('../');
var cwd         = require('path').resolve('test/fixtures');
var current     = process.cwd();
var gather      = require('../lib/gather-tasks');
var getBsConfig = require('../lib/utils').getBsConfig;

describe('Running Watch tasks', function () {
    it('can gather simple tasks', function (done) {
        watch({input: ['watch', 'someother']}, {
            pkg: {
                crossbow: {
                    watch: {
                        "bs-config": {
                            logLevel: 'silent',
                            open: false
                        },
                        "default": [
                            {
                                "**/*.js": "babel"
                            }
                        ],
                        "someother": [
                            {
                                "app/**/*.js": "babel2"
                            }
                        ]
                    }
                }
            },
            cb: function (err, out) {
                assert.equal(out.tasks.length, 1);
                out.bs.cleanup();
                done();
            }
        });
    });
    it('can gather all tasks', function (done) {
        watch({input: ['watch']}, {
            pkg: {
                crossbow: {
                    watch: {
                        "bs-config": {
                            logLevel: 'silent',
                            open: false
                        },
                        "default": [
                            {
                                "**/*.js": "babel"
                            }
                        ],
                        "someother": [
                            {
                                "app/**/*.js": "babel2"
                            }
                        ]
                    }
                }
            },
            cb: function (err, out) {
                assert.equal(out.tasks.length, 2);
                out.bs.cleanup();
                done();
            }
        });
    });
    it('can can error when no watch tasks found', function (done) {
        watch({input: ['watch']}, {
            pkg: {
                crossbow: {}
            },
            cb: function (err, out) {
                assert.isTrue(err instanceof Error);
                done();
            }
        });
    });
});