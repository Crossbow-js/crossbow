const assert = require('chai').assert;
const utils = require("../../utils");
const TaskReportType = require('../../../dist/task.runner').TaskReportType;

describe('Running tasks from object literals', function () {
    it('with single task', function () {
        const runner = utils.run({
            input: ['run', 'js'],
            flags: {}
        }, {
            tasks: {
                js: {
                    tasks: utils.task(100)
                }
            }
        });
        const reports  = utils.getReports(runner);
        // const complete = utils.getComplete(runner);
        assert.equal(reports.length, 2);
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.end);
        assert.equal(reports[1].stats.duration, 100);
    });
    it('with single task as array', function () {
        const runner = utils.run({
            input: ['run', 'js']
        }, {
            tasks: {
                js: [{
                    tasks: utils.task(1000)
                }]
            }
        });
        const reports  = utils.getReports(runner);
        // const complete = utils.getComplete(runner);
        assert.equal(reports.length, 2);
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.end);
        assert.equal(reports[1].stats.duration, 1000);
    });
    it('@sh with single task + env vars', function (done) {
        const runner = utils.getRunner(['js'], {
            tasks: {
                js: [{
                    input: '@sh sleep $SLEEP',
                    env: {
                        SLEEP: '0.1'
                    }
                }]
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function (reports) {
                assert.ok(reports.slice(-1)[0].stats.duration > 100);
                done();
            });
    });
    it('@npm with single task + env vars', function (done) {
        const runner = utils.getRunner(['js'], {
            tasks: {
                js: [{
                    input: '@npm sleep $SLEEP',
                    env: {
                        SLEEP: '0.1'
                    }
                }]
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function (reports) {
                assert.ok(reports.slice(-1)[0].stats.duration > 100);
                done();
            });
    });
});
