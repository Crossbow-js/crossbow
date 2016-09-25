const TaskReportType = require('../../../dist/task.runner').TaskReportType;
const assert         = require('chai').assert;
const utils          = require('../../utils');

const t100           = utils.task(100);
const t1000          = utils.task(1000);
const terror         = utils.error(2000);

describe("Running mix of tasks in seq + parallel", function () {
    it("js@p [ [1, x, 3] ]", function () {

        const runner = utils.run({
            input: ['run', 'js@p']
        }, {
            tasks: {
                'js': [t100, terror, t100]
            }
        });

        // test output
        runner.output
            .filter(x => x.origin === 'Summary')
            .subscribe(function (x) {
                assert.include(x.data[2], '2.00s (1 error)'); // 1s + 2 parallel at 100ms each === 1.10s
            });

        const reports = runner.subscription.messages[0].value.value.reports;

        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.start);
        assert.equal(reports[2].type, TaskReportType.start);
        assert.equal(reports[3].type, TaskReportType.end);
        assert.equal(reports[4].type, TaskReportType.end);
        assert.equal(reports[5].type, TaskReportType.error);
    });
    it("js@p [1 [2, x, 4]]", function () {

        const runner = utils.run({
            input: ['run', 'css', 'js@p']
        }, {
            tasks: {
                'css': [t100],
                'js':  [t100, terror, t100]
            }
        });

        // test output
        runner
            .output
            .filter(x => x.origin === 'Summary')
            .pluck('data')
            .subscribe(function (data) {
                assert.include(data[2], '2.10s (1 error)'); // 1s + 2 parallel at 100ms each === 1.10s
            });

        const reports = runner.subscription.messages[0].value.value.reports;

        // css
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.end);

        // js@p
        assert.equal(reports[2].type, TaskReportType.start);
        assert.equal(reports[3].type, TaskReportType.start);
        assert.equal(reports[4].type, TaskReportType.start);

        assert.equal(reports[5].type, TaskReportType.end);
        assert.equal(reports[6].type, TaskReportType.end);
        assert.equal(reports[7].type, TaskReportType.error);
    });
    it("js@p [ [1, 2] ]", function () {

        const runner = utils.run({
            input: ['run', 'js']
        }, {
            tasks: {
                'js@p': [t100, t100]
            }
        });

        const reports = runner.subscription.messages[0].value.value.reports;

        assert.equal(reports[0].type, 'start');
        assert.equal(reports[1].type, 'start');
        assert.equal(reports[2].type, 'end');
        assert.equal(reports[3].type, 'end');
    });
    it("css js [1 [2, 3]]", function () {

        const runner = utils.run({
            input: ['run', 'css', 'js']
        }, {
            tasks: {
                css: t1000,
                'js@p': [t100, t100]
            }
        });

        const reports = runner.subscription.messages[0].value.value.reports;

        assert.equal(reports[0].type, 'start', 'css start');
        assert.equal(reports[1].type, 'end',   'css end');
        assert.equal(reports[2].type, 'start', 'js01 start');
        assert.equal(reports[3].type, 'start', 'js02 start');
        assert.equal(reports[4].type, 'end',   'js01 end');
        assert.equal(reports[5].type, 'end' ,  'js02 end');
    });
    it("css js@p other [1 [2, 3] 4]", function () {

        const runner = utils.run({
            input: ['run', 'css', 'js', 'other']
        }, {
            tasks: {
                css: t1000,
                'js@p': [t100, t100],
                other: t100
            }
        });

        const reports = runner.subscription.messages[0].value.value.reports;

        assert.equal(reports[0].type, 'start');
        assert.equal(reports[1].type, 'end');

        assert.equal(reports[2].type, 'start');
        assert.equal(reports[3].type, 'start');
        assert.equal(reports[4].type, 'end');
        assert.equal(reports[5].type, 'end');

        assert.equal(reports[6].type, 'start');
        assert.equal(reports[7].type, 'end');
    });
    it("reports grouped tasks with @p", function () {

        const runner = utils.getRunner(['build'], {
            tasks: {
                'build': ['css', 'js'],
                css: function cssTask() {

                },
                js: ['other:*@p'],
                other: function (opts) {

                }
            },
            options: {
                other: {
                    one: {
                        input: 'input 1'
                    },
                    two: {
                        input: 'input 2'
                    }
                }
            }
        });

        assert.equal(runner.sequence[0].type, 'SeriesGroup');
        assert.equal(runner.sequence[0].taskName, 'build');
        assert.equal(runner.sequence[0].items.length, 2);

        assert.equal(runner.sequence[0].items[0].type, 'Task');
        assert.equal(runner.sequence[0].items[1].type, 'SeriesGroup');
        assert.equal(runner.sequence[0].items[1].taskName, 'js');

        assert.equal(runner.sequence[0].items[1].items[0].type, 'ParallelGroup');
        assert.equal(runner.sequence[0].items[1].items[0].items[0].type, 'Task');
        assert.equal(runner.sequence[0].items[1].items[0].items[1].type, 'Task');

        assert.equal(runner.sequence[0].items[1].items[0].type, 'ParallelGroup');
        assert.equal(runner.sequence[0].items[1].items[0].items.length, 2);
    });
});
