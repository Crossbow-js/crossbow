const assert = require('chai').assert;
const utils = require("../../utils");
const seq = require("../../../dist/task.sequence");
const types = require('../../../dist/task.runner').TaskReportType;

describe('Gathering completed stats', function () {
    it('can join stats to a success item (1)', function (done) {
        var runner = utils.getRunner(['js'], {
            tasks: {
                js: ['test/fixtures/tasks/simple']
            }
        });
        runner
            .runner
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
    it('can join stats to an error item (2)', function (done) {
        var runner = utils.getRunner(['@npm sleep']);
        runner
            .runner
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
    it('can join stats to an error item + success in parallel', function () {
        var runner = utils.run({
            input: ['run', 'error', 'ok'],
            flags: {
                parallel: true
            }
        }, {
            tasks: {
                error: utils.error(5000),
                ok: utils.task(100)
            }
        });
        const output  = runner.subscription.messages[0].value.value;
        const reports = output.reports;

        assert.equal(reports[0].type, types.start);
        assert.equal(reports[1].type, types.start);

        assert.equal(reports[2].type, types.end);
        assert.equal(reports[3].type, types.error);
    });
});
