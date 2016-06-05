const assert = require('chai').assert;
const cli = require("../");
const TaskReportType = require('../dist/task.runner').TaskReportType;

describe('Running tasks from inline-functions with errors', function () {
    it('can survive a sibling failure in parallel mode', function (done) {
        var called = 0;
        const runner = cli.getRunner(['buildall'], {
            tasks: {
                "buildall@p": ['js', 'css'],
                js: function () {
                    called += 1;
                    throw new Error('Oops!');
                },
                css: function (opts, ctx, done) {
                    setTimeout(function () {
                        called += 1;
                        done();
                    }, 200);
                }
            }
        });
        runner.runner
            .parallel()
            .toArray()
            .subscribe(function (reports) {
                assert.equal(reports[0].type, TaskReportType.start);
                assert.equal(reports[1].type, TaskReportType.error);
                assert.equal(reports[2].type, TaskReportType.start);
                assert.equal(reports[3].type, TaskReportType.end);
                done();
            });
    });
    it('can stops siblings after failure in series mode', function (done) {
        const runner = cli.getRunner(['buildall'], {
            tasks: {
                "buildall": ['js', 'css'],
                js: function () {
                    throw new Error('Oops!');
                },
                css: function (opts, ctx, done) {
                    setTimeout(function () {
                        done();
                    }, 200);
                }
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function (reports) {
                assert.equal(reports[0].type, TaskReportType.start);
                assert.equal(reports[1].type, TaskReportType.error);
                assert.equal(reports.length, 2);
                done();
            });
    });
});
