const assert = require('chai').assert;
const cli    = require("../");

describe.skip('Gathering run task with return types', function () {
    it('can handle node streams', function (done) {

        const taskRunner = cli.getRunner(['test/fixtures/tasks/stream.js']);

        const stream$ = taskRunner
            .runner
            .series();

        stream$.subscribeOnCompleted(x => {
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
    it('can group tasks for reporting', function (done) {
        var runner = cli({
            input: ["run",
                "test/fixtures/tasks/simple.js",
                "test/fixtures/tasks/stream.js",
                "test/fixtures/tasks/simple.js:dev2",
                "test/fixtures/tasks/simple.js:dev1:dev2"
            ],
            flags: {
                handoff: true
            }
        }, {
            config: {
                "test/fixtures/tasks/simple.js": {
                    dev1: {},
                    dev2: {}
                }
            }
        });

        runner.run
            .subscribe(function () {},
            function (err) { console.log(err); },
            function () {
                var grouped = seq.groupByParent(runner.sequence);
                assert.equal(grouped.length, 5);
                assert.equal(grouped[0].name, "test/fixtures/tasks/simple.js");
                assert.equal(grouped[1].name, "test/fixtures/tasks/stream.js");
                assert.equal(grouped[2].name, "test/fixtures/tasks/simple.js:dev2");
                assert.equal(grouped[3].name, "test/fixtures/tasks/simple.js:dev1");
                assert.equal(grouped[4].name, "test/fixtures/tasks/simple.js:dev2");
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
