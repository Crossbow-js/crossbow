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
        input: ["run"].concat(file.map(function(x) { return "test/fixtures/tasks/" + x } )),
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
            assert.isTrue(runner.sequence[0].seq.taskItems[0].completed);
            assert.isTrue(runner.sequence[0].seq.taskItems[1].completed);
            assert.equal(runner.sequence[0].seq.taskItems.length, 2);
            done();
        });
    });
    it('can handle promise', function (done) {
        testCase(['promise.js'], function (err, runner) {
            assert.isTrue(runner.sequence[0].seq.taskItems[0].completed);
            assert.isTrue(runner.sequence[0].seq.taskItems[1].completed);
            assert.isTrue(runner.sequence[0].seq.taskItems[2].completed);
            done();
        });
    });
    it('can handle mixed with options', function (done) {
        var runner = cli({
            input: ["run",
                "test/fixtures/tasks/simple.js:dev1",
                "test/fixtures/tasks/simple.js:dev2",
                "test/fixtures/tasks/simple2.js",
                "test/fixtures/tasks/stream.js"
            ],
            flags: {
                handoff: true
            }
        }, {
            crossbow: {
                config: {
                    "test/fixtures/tasks/simple.js": {
                        "dev1": {
                            input: "shane"
                        },
                        "dev2": {
                            input: "shane"
                        }
                    },
                    "test/fixtures/tasks/stream.js": {

                    }
                }
            }
        });

        runner.run
            .subscribe(function () {},
            function (err) { console.log(err); },
            function () {
                assert.equal(runner.sequence[0].opts.input, 'shane');
                assert.equal(runner.sequence[1].opts.input, 'shane');

                assert.isTrue(runner.sequence[0].seq.taskItems[0].completed);
                assert.isTrue(runner.sequence[1].seq.taskItems[0].completed);
                assert.isTrue(runner.sequence[2].seq.taskItems[0].completed);
                assert.isTrue(runner.sequence[3].seq.taskItems[0].completed);
                assert.isTrue(runner.sequence[3].seq.taskItems[1].completed);
                done();
            }
        );
    });
    it('can handle observable', function (done) {
        testCase(['observable.js'], function (err, runner) {
            assert.isTrue(runner.sequence[0].seq.taskItems[0].completed);
            assert.isTrue(runner.sequence[0].seq.taskItems[1].completed);
            done();
        });
    });
    it('can handle multiple types', function (done) {
        testCase(['stream', 'promise.js', 'observable.js'], function (err, runner) {
            assert.isTrue(runner.sequence[0].seq.taskItems[0].completed);
            assert.isTrue(runner.sequence[0].seq.taskItems[1].completed);
            assert.isTrue(runner.sequence[1].seq.taskItems[0].completed);
            assert.isTrue(runner.sequence[1].seq.taskItems[1].completed);
            assert.isTrue(runner.sequence[1].seq.taskItems[2].completed);
            assert.isTrue(runner.sequence[2].seq.taskItems[0].completed);
            assert.isTrue(runner.sequence[2].seq.taskItems[1].completed);
            done();
        });
    });
});