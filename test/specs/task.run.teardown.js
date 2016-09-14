const assert = require('chai').assert;
const cli = require("../../");
const TaskErrorTypes = require('../../dist/task.errors').TaskErrorTypes;

describe('returning teardown logic from a task', function () {
    it('should clear the timeout', function (done) {
        var called = 0;
        const runner = cli.getRunner(['js --shane'], {
            tasks: {
                js: function (options, context, done) {
                    called++;
                    const out = setTimeout(function () {
                        called++;
                    }, 2000);
                    done();
                    return function teardown () {
                        clearTimeout(out);
                        called++;
                    };
                }
            }
        });
        // console.log(runner.tasks.invalid[0].tasks[0])
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.equal(called, 2);
                done();
            });
    });
});
