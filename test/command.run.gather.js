var assert = require('chai').assert;
var watch = require('../lib/command.watch');
var cwd = require('path').resolve('test/fixtures');
var current = process.cwd();
var resolve = require('path').resolve;
var gather = require('../lib/command.copy').gatherCopyTasks;
var getBsConfig = require('../lib/utils').getBsConfig;

describe('Gathering run tasks', function () {
    it('can gather simple tasks', function (done) {

        var cli = require("../cli");

        cli({              // valid                            // valid
            input: ["run", "sass:dev:prod", "icons:all", "js", "example.js"],
        }, {
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
    it.only('can gather when using an alias', function (done) {

        var cli = require("../cli");

        cli({
            input: ["run", "css"]
        }, {
            crossbow: {
                tasks: {
                    css: ['sass', 'example.js']
                }
            }
        }, function (err, output) {
            //assert.equal(output.valid.length, 2);
            //assert.equal(output.valid[0].taskName, 'sass');
            //assert.equal(output.valid[1].taskName, 'example.js');
            done();
        })
    });
    //it('can gather nested simple tasks', function () {
    //    var tasks = gather({
    //        copy: {
    //            tasks: [
    //                {
    //                    "**/*.js": "babel"
    //                }
    //            ]
    //        }
    //    });
    //
    //    assert.equal(tasks.length, 1);
    //    assert.equal(tasks[0].src[0], '**/*.js');
    //    assert.equal(tasks[0].dest[0],    'babel');
    //});
    //it('can select namespaced copy tasks (2)', function () {
    //    var tasks = gather({
    //        copy: {
    //            "someother": {
    //                "app/**/*.js": "babel2"
    //            },
    //            "default": {
    //                "app/**/*.css": "public/css"
    //            },
    //        }
    //    }, 'someother');
    //
    //    assert.equal(tasks.length, 1);
    //    assert.equal(tasks[0].src[0], 'app/**/*.js');
    //    assert.equal(tasks[0].dest[0], 'babel2');
    //});
});