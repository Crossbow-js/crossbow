const assert = require('chai').assert;
const Rx = require('rx');
const cli = require("../");
const errorTypes = require('../dist/task.errors').TaskErrorTypes;
const RunCommandReportTypes = require('../dist/command.run.execute').RunCommandReportTypes;

describe('Running with task stats', function () {
    it('reports when a task is completed', function (done) {
    	const runner = cli.runner(['@npm sleep .2']);
        runner.series()
            .toArray()
            .subscribe(trs => {
                assert.equal(trs.length, 2);
                assert.equal(trs[0].type, 'start');
                assert.equal(trs[1].type, 'end');
                done();
            })
    });
    it('reports when a task gives error', function (done) {
    	const runner = cli.runner(['test/fixtures/tasks/error.js']);
        runner.series()
            .catch(x => Rx.Observable.empty())
            .toArray()
            .subscribe(reports => {
                assert.equal(reports.length, 2);
                assert.equal(reports[0].type, 'start');
                assert.equal(reports[1].type, 'error');
                assert.equal(reports[1].stats.errors.length, 1);
                done();
            });
    });
    it('returns an error', function (done) {
        var calls = [];
        cli.run(['build'], {}, {
            config: 'examples/circular.yaml'
        })
            .catch(x => {
                calls.push(x);
                assert.equal(calls.length, 2);
                assert.equal(calls[0].type, RunCommandReportTypes.InvalidTasks);
                done();
                return Rx.Observable.empty();
            })
            .subscribe(x => {
                assert.equal(x.type, RunCommandReportTypes.InvalidTasks);
                calls.push(x);
            });
    });
    it('runs without error', function (done) {
        cli.run(['js'], {}, {
            config: 'examples/crossbow.js'
        })
        .subscribe(x => {
            assert.equal(x.type, RunCommandReportTypes.Complete);
        }, function (err) {
            console.error(err);
        }, function () {
            done();
        })
    });
});
