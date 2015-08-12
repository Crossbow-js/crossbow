var assert = require('chai').assert;
var watch = require('../lib/command.watch');
var cwd = require('path').resolve('test/fixtures');
var current = process.cwd();
var resolve = require('path').resolve;
var gather = require('../lib/command.copy').gatherCopyTasks;
var getBsConfig = require('../lib/utils').getBsConfig;
var cli = require("../cli");

function testCase (command, input, cb) {
    cli({input: command}, input, cb);
}

describe.only('Gathering run tasks', function () {
    it('can gather simple tasks', function (done) {
        testCase(["run", "sass:dev:prod", "icons:all", "js", "example.js"], {
            crossbow: {
                sass: {
                    default: {
                        input: "scss/scss/core.scss",
                        output: "css/scss/core.css"
                    },
                    dev: {
                        input: "scss/scss/core.scss",
                        output: "css/scss/core.min.css"
                    }
                }
            }
        }, function (err, output) {
            assert.equal(output.valid.length, 2);
            assert.equal(output.valid[0].subTasks.length, 2);
            assert.equal(output.valid[1].subTasks.length, 0);
            done();
        })
    });
    it('can gather valid tasks when using an alias', function (done) {
        testCase(["run", "css", "js"], {
            crossbow: {
                tasks: {
                    css: ['sass', 'example.js', 'js'],
                    js:  ['cli.js', 'lib/ctx']
                }
            }
        }, function (err, output) {

            var first = output.valid[0];

            assert.equal(first.taskName, 'css');
            assert.equal(first.modules.length, 0);
            assert.equal(first.tasks.length, 3);
            assert.equal(first.tasks[2].tasks.length, 2);
            assert.equal(first.tasks[2].tasks[0].taskName, 'cli.js');
            assert.equal(first.tasks[2].tasks[1].taskName, 'lib/ctx');
            assert.equal(first.tasks[2].tasks[1].modules.length, 1);
            assert.equal(output.valid.length, 2);
            done();
        })
    });
    it('can gather invalid tasks when using an alias', function (done) {
        testCase(['run', 'css', 'js'], {
            crossbow: {
                tasks: {
                    css: ['sass', 'example.js', 'jsa'],
                    js:  ['cli.js', 'lib/ctx']
                }
            }
        }, function (err, output) {
            assert.equal(output.valid.length, 1);
            assert.equal(output.invalid.length, 1);
            done();
        });
    });
});