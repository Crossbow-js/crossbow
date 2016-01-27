const assert = require('chai').assert;
const watch  = require('../lib/command.watch');
const cli    = require("../cli");

describe('Gathering run tasks for grunt', function () {
    it('can use grunt-compat to gather single Grunt tasks', function (done) {
        cli({
            input: ["run", "$grunt jshint"]
        }, {
            crossbow: {
                gruntfile: "examples/Gruntfile.js"
            }
        }, function (err, out) {
            assert.equal(out.tasks.valid[0].taskName, 'jshint');
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
            assert.equal(out.tasks.valid[0].taskName, 'jshint:dev jshint:other');
            assert.equal(out.tasks.valid[0].compat, 'grunt');
            done();
        });
    });
    it('can use shell-compat to gather shell command', function (done) {
        var runner = cli({
            input: ["run", "$shell npm run es6"],
            flags: {handoff: true}
        }, {
            crossbow: {}
        });

        assert.equal(runner.sequence[0].task.compat, 'shell');
        assert.equal(runner.sequence[0].task.rawInput, 'npm run es6');

        done();
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
