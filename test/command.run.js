var assert = require('chai').assert;
var watch = require('../lib/command.watch');
var cwd = require('path').resolve('test/fixtures');
var current = process.cwd();
var resolve = require('path').resolve;
var getBsConfig = require('../lib/utils').getBsConfig;
var cli = require("../cli");
var Rx = require('rx');

function testCase (file, cb) {
    var runner = cli({
        input: ["run"].concat(file.map(x => "test/fixtures/tasks/" + x)),
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
        	cb(null, runner);
        }
    );
}

describe('Gathering run task with return types', function () {
    it('can handle node streams', function (done) {
        testCase(['stream.js'], function (err, runner) {
            assert.isTrue(runner.sequence[0].fns[0].completed);
            assert.equal(runner.sequence[0].fns[0].fn.length, 2);
            done();
        });
    });
    it.only('can handle promise', function (done) {
        testCase(['promise.js'], function (err, runner) {
            assert.isTrue(runner.sequence[0].fns[0].taskMap[0].completed);
            assert.isNumber(runner.sequence[0].fns[0].taskMap[0].duration);
            assert.isTrue(runner.sequence[0].fns[0].taskMap[1].completed);
            assert.isTrue(runner.sequence[0].fns[0].taskMap[2].completed);
            done();
        });
    });
    it('can handle observable', function (done) {
        testCase(['observable.js'], function (err, runner) {
            assert.isTrue(runner.sequence[0].fns[0].completed);
            assert.isTrue(runner.sequence[0].fns[1].completed);
            done();
        });
    });
    it('can handle multiple types', function (done) {
        testCase(['stream', 'promise.js', 'observable.js'], function (err, runner) {
            assert.isTrue(runner.sequence[0].fns[0].completed);
            assert.isTrue(runner.sequence[0].fns[1].completed);
            assert.isTrue(runner.sequence[1].fns[0].completed);
            assert.isTrue(runner.sequence[1].fns[1].completed);
            assert.isTrue(runner.sequence[1].fns[2].completed);
            assert.isTrue(runner.sequence[2].fns[0].completed);
            assert.isTrue(runner.sequence[2].fns[1].completed);
            done();
        });
    });
});