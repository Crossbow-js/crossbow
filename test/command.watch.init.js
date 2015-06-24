var assert = require('chai').assert;
var watch = require('../lib/command.watch');
var cwd = require('path').resolve('test/fixtures');
var current = process.cwd();
var gather = require('../lib/gather-tasks');
var getBsConfig = require('../lib/utils').getBsConfig;

describe('Adding watchers based on config', function () {
    it('can gather simple tasks', function (done) {
        watch({input: ['watch', 'default', 'other']}, {
            crossbow: {
                watch: {
                    "bs-config": {
                        logLevel: 'silent',
                        open: false
                    },
                    "default": {
                        "**/*.css": ['build'],
                        "**/*.js": ['babel']
                    },
                    "other": [
                        {
                            patterns: ["*.html", "app/*.html"],
                            tasks: ['build', 'deploy']
                        },
                        {
                            "**": 'babel'
                        }
                    ]
                }
            },
            cb: function (err, out) {
                assert.equal(out.tasks.length, 4);
                assert.equal(out.tasks[0].patterns[0], '**/*.css');
                assert.equal(out.tasks[1].patterns[0], '**/*.js');
                assert.deepEqual(out.tasks[2].patterns, ["*.html", "app/*.html"]);
                assert.deepEqual(out.tasks[3].patterns, ['**']);
                out.bs.cleanup();
                done();
            }
        });
    });
});