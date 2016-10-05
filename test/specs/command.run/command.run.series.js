const TaskReportType = require('../../../dist/task.runner').TaskReportType;
const assert         = require('chai').assert;
const utils          = require('../../utils');

const t100           = utils.task(100);
const t200           = utils.task(200);
const terror         = utils.error(2000);

describe("Running tasks in series", function () {
    it("single  1", function () {

        const runner = utils.run({
            input: ['run', 'js']
        }, {
            tasks: {
                'js': t100
            }
        });

        const reports  = utils.getReports(runner);
        assert.equal(reports.length, 2);
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.end);
    });
    it("multi 1, 2", function () {

        const runner = utils.run({
            input: ['run', 'js']
        }, {
            tasks: {
                'js': [t100, t200]
            }
        });

        const reports  = utils.getReports(runner);
        const complete = utils.getComplete(runner);

        assert.equal(reports.length, 4);
        assert.equal(complete.runtime, 300);
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.end);
        assert.equal(reports[2].type, TaskReportType.start);
        assert.equal(reports[3].type, TaskReportType.end);
    });
    it("multi input [ 1, 2 ]", function () {

        const runner = utils.run({
            input: ['run', 'js', 'js2']
        }, {
            tasks: {
                'js': t100,
                'js2': [t200]
            }
        });

        const reports  = utils.getReports(runner);
        const complete = utils.getComplete(runner);

        assert.equal(reports.length, 4);
        assert.equal(complete.runtime, 300);
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.end);
        assert.equal(reports[2].type, TaskReportType.start);
        assert.equal(reports[3].type, TaskReportType.end);
    });
    it("multi input + multi in task [ 1, 2 ]", function () {

        const runner = utils.run({
            input: ['run', 'js', 'js2']
        }, {
            tasks: {
                'js': [t100, t100, t100],
                'js2': [t200, t200, t200, t200]
            }
        });

        const reports  = utils.getReports(runner);
        const complete = utils.getComplete(runner);

        assert.equal(reports.length, 14);
        assert.equal(complete.runtime, 1100);
    });
    it("object literal", function () {

        const runner = utils.run({
            input: ['run', 'js']
        }, {
            tasks: {
                'js': {tasks: [t100, t100, t100]}
            }
        });

        const reports  = utils.getReports(runner);
        const complete = utils.getComplete(runner);

        assert.equal(reports.length, 6);
        assert.equal(complete.runtime, 300);
    });
    it("inline object literal", function () {

        const runner = utils.run({
            input: ['run', 'js']
        }, {
            tasks: {
                'js': {
                    tasks: [t100, t100, t100, {tasks: [t100]}]
                }
            }
        });

        const reports  = utils.getReports(runner);
        const complete = utils.getComplete(runner);

        assert.equal(reports.length, 8);
        assert.equal(complete.runtime, 400);
    });
    it("alias", function () {

        const runner = utils.run({
            input: ['run', 'js']
        }, {
            tasks: {
                'js': 'css',
                'css': {
                    tasks: [t100]
                }
            }
        });

        const reports  = utils.getReports(runner);
        const complete = utils.getComplete(runner);

        assert.equal(reports.length, 2);
        assert.equal(complete.runtime, 100);
    });
    it("alias mixes", function () {

        const runner = utils.run({
            input: ['run', 'js', 'css']
        }, {
            tasks: {
                'js': 'css',
                'css': {
                    tasks: [t100]
                }
            }
        });

        const reports  = utils.getReports(runner);
        const complete = utils.getComplete(runner);

        assert.equal(reports.length, 4);
        assert.equal(complete.runtime, 200);
    });
    it("error [1, x]", function () {

        const runner = utils.run({
            input: ['run', 'js']
        }, {
            tasks: {
                'js': ['css', terror],
                'css': [t100]
            }
        });

        const reports  = utils.getReports(runner);
        const complete = utils.getComplete(runner);

        assert.equal(reports.length, 4);
        assert.equal(complete.runtime, 2100);
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.end);
        assert.equal(reports[2].type, TaskReportType.start);
        assert.equal(reports[3].type, TaskReportType.error);
    });
    it("error first [x, 2]", function () {

        const runner = utils.run({
            input: ['run', 'js']
        }, {
            tasks: {
                'js': [terror, 'css'],
                'css': [t100]
            }
        });

        const reports  = utils.getReports(runner);
        const complete = utils.getComplete(runner);

        assert.equal(reports.length, 2);
        assert.equal(complete.runtime, 2000);
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.error);
    });
});
