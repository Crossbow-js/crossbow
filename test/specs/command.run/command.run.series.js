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

        assert.equal(reports.length, 4);
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

        assert.equal(reports.length, 4);
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

        assert.equal(reports.length, 14);
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

        assert.equal(reports.length, 6);
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

        assert.equal(reports.length, 8);
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

        assert.equal(reports.length, 2);
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

        assert.equal(reports.length, 4);
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

        assert.equal(reports.length, 4);
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

        assert.equal(reports.length, 2);
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.error);
    });
    it("gives nice function name output in report", function () {

        const runner = utils.run({
            input: ['run', 'js', 'css', 'css:dev', 'css:*', 'js-file'],
            flags: {
                progress: true
            }
        }, {
            tasks: {
                'js':      [function () {}, function withName() {}],
                'css':     function myCssFunction() {},
                'js-file': 'test/fixtures/tasks/simple.js'
            },
            options: {
                css: {
                    dev:  {name: 'shane'},
                    prod: {name: 'kittie'},
                }
            }
        });

        const reports  = utils.getReports(runner);

        const types     = require('../../../dist/reporter.resolve').ReportTypes.TaskReport;
        const reporters = require('../../../dist/reporters/defaultReporter').reporterFunctions;
        const fn        = reporters[types];
        const out       = reports.map(x => fn({
            data: {
                report: x,
                progress: true
            }
        }));

        assert.include(out[0], `{yellow:>} [Function: _inline_fn_`);
        assert.equal(out[2], `{yellow:>} [Function: withName]`);
        assert.equal(out[3], `{green:✔} [Function: withName] {yellow:(0.00s)}`);

        assert.equal(out[4], `{yellow:>} [Function: myCssFunction]`);
        assert.equal(out[5], `{green:✔} [Function: myCssFunction] {yellow:(0.00s)}`);

        assert.equal(out[6], `{yellow:>} css:{bold:dev}`);
        assert.equal(out[7], `{green:✔} css:{bold:dev} {yellow:(0.00s)}`);

        assert.equal(out[8], `{yellow:>} css:{bold:dev}`, 'first from star');
        assert.equal(out[9], `{green:✔} css:{bold:dev} {yellow:(0.00s)}`, 'first from star');

        assert.equal(out[10], `{yellow:>} css:{bold:prod}`,                 'second from star');
        assert.equal(out[11], `{green:✔} css:{bold:prod} {yellow:(0.00s)}`, 'second from star');

        assert.equal(out[12], `{yellow:>} test/fixtures/tasks/simple.js`);
        assert.equal(out[13], `{green:✔} test/fixtures/tasks/simple.js {yellow:(0.10s)}`, 'second from star');
    });
    it("shows when tasks have been run with flags", function () {

        const runner = utils.run({
            input: ['run', 'js --name=kittie'],
            flags: {
                progress: true
            }
        }, {
            tasks: {
                'js': function withName() {

                }
            },
            options: {
                css: {
                    dev:  {name: 'shane'},
                    prod: {name: 'kittie'},
                }
            }
        });

        const reports  = utils.getReports(runner);

        const types     = require('../../../dist/reporter.resolve').ReportTypes.TaskReport;
        const reporters = require('../../../dist/reporters/defaultReporter').reporterFunctions;
        const fn        = reporters[types];
        const out       = reports.map(x => fn({
            data: {
                report: x,
                progress: true
            }
        }));

        // assert.include(out[0], `{yellow:>} [Function: _inline_fn_`);
        // assert.equal(out[2], `{yellow:>} [Function: withName]`);
        // assert.equal(out[3], `{green:✔} [Function: withName] {yellow:(0.00s)}`);
        //
        // assert.equal(out[4], `{yellow:>} [Function: myCssFunction]`);
        // assert.equal(out[5], `{green:✔} [Function: myCssFunction] {yellow:(0.00s)}`);
        //
        // assert.equal(out[6], `{yellow:>} css:{bold:dev}`);
        // assert.equal(out[7], `{green:✔} css:{bold:dev} {yellow:(0.00s)}`);
        //
        // assert.equal(out[8], `{yellow:>} css:{bold:dev}`, 'first from star');
        // assert.equal(out[9], `{green:✔} css:{bold:dev} {yellow:(0.00s)}`, 'first from star');
        //
        // assert.equal(out[10], `{yellow:>} css:{bold:prod}`,                 'second from star');
        // assert.equal(out[11], `{green:✔} css:{bold:prod} {yellow:(0.00s)}`, 'second from star');
        //
        // assert.equal(out[12], `{yellow:>} test/fixtures/tasks/simple.js`);
        // assert.equal(out[13], `{green:✔} test/fixtures/tasks/simple.js {yellow:(0.10s)}`, 'second from star');
    });
});
