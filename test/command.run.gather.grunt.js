var assert = require('chai').assert;
var watch = require('../lib/command.watch');
var cwd = require('path').resolve('test/fixtures');
var current = process.cwd();
var resolve = require('path').resolve;
var getBsConfig = require('../lib/utils').getBsConfig;
var cli = require("../cli");

function testCase (command, input, cb) {
    cli({input: command}, input, cb);
}

describe('Gathering run tasks for grunt', function () {
    it('can use grunt-compat to gather single Grunt tasks', function (done) {
        cli({
            input: ["run", "$grunt jshint"]
        }, {
            crossbow: {
                gruntfile: "examples/Gruntfile.js"
            }
        }, function (err, out) {
            assert.equal(out.tasks.valid[0].taskName[0], 'jshint');
            assert.equal(out.tasks.valid[0].compat, 'grunt');
            done();
        });
    });
    it('can use grunt-compat to gather multiple Grunt tasks', function (done) {
        cli({
            input: ["run", "$grunt jshint:dev jshint:other"]
        }, {
            crossbow: {
                gruntfile: "examples/Gruntfile.js"
            }
        }, function (err, out) {
            assert.equal(out.tasks.valid[0].taskName[0], 'jshint:dev');
            assert.equal(out.tasks.valid[0].taskName[1], 'jshint:other');
            assert.equal(out.tasks.valid[0].compat, 'grunt');
            done();
        });
    });
    it('can flag attempted compat flag that does not exist', function (done) {
        var runner = cli({
            input: ["run", "$gulp jshint:dev jshint:other"],
            flags: {
                handoff: true
            }
        }, {
            crossbow: {}
        });

        runner.run
            .subscribe(function () {},
            function (err) { console.log(err); },
            function () {
                assert.equal(runner.tasks.invalid[0].taskName, '$gulp jshint:dev jshint:other');
                done();
            }
        );
    });
});