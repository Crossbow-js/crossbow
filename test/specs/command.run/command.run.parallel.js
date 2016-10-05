const TaskReportType = require('../../../dist/task.runner').TaskReportType;
const assert         = require('chai').assert;
const utils          = require('../../utils');

const t100           = utils.task(100);
const t200           = utils.task(200);
const terror         = utils.error(2000);

describe("Running tasks in parallel", function () {
    it("two object literal [ [1, 2] ]", function () {

        const runner = utils.run({
            input: ['run', 'js']
        }, {
            tasks: {
                'js': {tasks: [t100, t100], runMode: 'parallel'}
            }
        });

        const reports  = utils.getReports(runner);

        assert.equal(reports.length, 4);
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.start);
        assert.equal(reports[2].type, TaskReportType.end);
        assert.equal(reports[3].type, TaskReportType.end);
    });
    it("nested object literall [ [1, 2], 3 ]", function () {

        const runner = utils.run({
            input: ['run', 'js']
        }, {
            tasks: {
                'js': [
                    {tasks: [t100, t100], runMode: 'parallel'},
                    'css'
                ],
                'css': t100
            }
        });

        const reports  = utils.getReports(runner);

        assert.equal(reports.length, 6);
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.start);
        assert.equal(reports[2].type, TaskReportType.end);
        assert.equal(reports[3].type, TaskReportType.end);
        assert.equal(reports[4].type, TaskReportType.start);
        assert.equal(reports[5].type, TaskReportType.end);
    });
    it("nested object array literal [ [1, 2], 3 ]", function () {

        const runner = utils.run({
            input: ['run', 'js']
        }, {
            tasks: {
                'js': [
                    [t100, t100],
                    'css'
                ],
                'css': t100
            }
        });

        const reports  = utils.getReports(runner);

        assert.equal(reports.length, 6);
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.start);
        assert.equal(reports[2].type, TaskReportType.end);
        assert.equal(reports[3].type, TaskReportType.end);

        assert.equal(reports[4].type, TaskReportType.start);
        assert.equal(reports[5].type, TaskReportType.end);
    });
});
