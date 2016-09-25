const assert = require('chai').assert;
const cli = require("../../");
const seq = require("../../dist/task.sequence");

describe('Gathering completed stats', function () {
    it('can join stats to a success item', function (done) {
        var runner = cli.runner(['js'], {
            tasks: {
                js: ['test/fixtures/tasks/simple']
            }
        });
        runner
            .series()
            .toArray()
            .subscribe(reports => {
                const joined = seq.decorateSequenceWithReports(runner.sequence, reports);
                const report = joined[0].items[0].stats;
                assert.equal(report.completed, true);
                assert.isNumber(report.startTime);
                assert.isNumber(report.duration);
                assert.isNumber(report.endTime);
                assert.deepEqual(report.errors, []);
                done();
            });
    });
    it('can join stats to an error item', function (done) {
        var runner = cli.runner(['@npm sleep']);
        runner
            .series()
            .toArray()
            .subscribe(reports => {
                const joined = seq.decorateSequenceWithReports(runner.sequence, reports);
                const report = joined[0].stats;
                assert.equal(report.started, true);
                assert.equal(report.completed, false);
                assert.equal(report.errors.length, 1);
                done();
            });
    });
    it('can join stats to an error item', function (done) {
        var runner = cli.runner(['@npm sleep', '@npm sleep 0.5']);
        runner
            .parallel()
            .toArray()
            .subscribe(reports => {
                const joined = seq.decorateSequenceWithReports(runner.sequence, reports);
                const error  = joined[0].stats;
                const ok     = joined[1].stats;
                assert.equal(error.started, true);
                assert.equal(error.completed, false);
                assert.equal(error.errors.length, 1);

                assert.equal(ok.started, true);
                assert.equal(ok.completed, true);
                assert.equal(ok.errors.length, 0);
                done();
            });
    });
});
