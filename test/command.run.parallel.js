var assert = require('chai').assert;
var watch = require('../lib/command.watch');
var cli = require("../cli");

describe('Running functions in parallel', function () {
    it('runs two functions at the same time', function (done) {
        this.timeout(5000);
        const now = new Date().getTime();
        var runner = cli({
            input: ['run', 'test/fixtures/tasks/parallel1.js', 'test/fixtures/tasks/parallel2.js'],
            flags: {handoff: true}
        }, {
            crossbow: {}
        });

        runner
            .parallel()
            .subscribe(
                x => {
                },
                e => cb(e),
                d => {
                    assert.isTrue(new Date().getTime() - now > 200);
                    assert.isTrue(new Date().getTime() - now < 300);
                    done();
                }
            );
    });
});
