const TaskReportType = require('../../dist/task.runner').TaskReportType;
const assert         = require('chai').assert;
const Rx             = require('rx');
const cli            = require('../../dist/index');
const utils          = require('../utils');
const t100           = utils.task(100);
const t1000          = utils.task(1000);
const terror         = utils.error(2000);

const run = function (input, config) {
    const scheduler  = new Rx.TestScheduler();
    const obs        = new Rx.ReplaySubject(100, null, scheduler);

    input.flags                = input.flags || {};
    input.flags.outputObserver = obs;
    input.flags.scheduler      = scheduler;

    const runner = cli.default(input, config);
    return scheduler.startScheduler(() => runner, {created: 0, subscribed: 0, disposed: 4000});
};

describe("Running mix of tasks in seq + parallel", function () {
    it("js@p [ [1, x, 3] ]", function () {

        const scheduler  = new Rx.TestScheduler();
        const obs        = new Rx.ReplaySubject(100, null, scheduler);

        const runner = cli.default({
            input: ['run', 'js@p'],
            flags: {
                scheduler: scheduler,
                outputObserver: obs,
                exitOnError: false
            }
        }, {
            tasks: {
                'js': [t100, terror, t100]
            }
        });

        // test output
        obs.filter(x => x.origin === 'Summary')
            .take(3)
            .toArray()
            .subscribe(function (data) {
                assert.include(data[2].data, '2.00s (1 error)'); // 1s + 2 parallel at 100ms each === 1.10s
            });

        const out     = scheduler.startScheduler(() => runner, {created: 0, subscribed: 0, disposed: 4000});
        const reports = out.messages[0].value.value.reports;

        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.start);
        assert.equal(reports[2].type, TaskReportType.start);
        assert.equal(reports[3].type, TaskReportType.end);
        assert.equal(reports[4].type, TaskReportType.end);
        assert.equal(reports[5].type, TaskReportType.error);
    });
    it("js@p [1 [2, x, 4]]", function () {
        const scheduler  = new Rx.TestScheduler();
        const obs        = new Rx.ReplaySubject(100, null, scheduler);

        const runner = cli.default({
            input: ['run', 'css', 'js@p'],
            flags: {scheduler: scheduler, outputObserver: obs, exitOnError: false}
        }, {
            tasks: {
                'css': [t100],
                'js':  [t100, terror, t100]
            }
        });

        // test output
        obs.filter(x => x.origin === 'Summary')
            .take(3)
            .pluck('data')
            .toArray()
            .map(x => x.join('\n'))
            .subscribe(function (data) {
                assert.include(data, '2.10s (1 error)'); // 1s + 2 parallel at 100ms each === 1.10s
            });

        const out = scheduler.startScheduler(function () {
            return runner;
        }, {created: 0, subscribed: 0, disposed: 4000});

        const reports = out.messages[0].value.value.reports;

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
        const scheduler  = new Rx.TestScheduler();
        const obs        = new Rx.ReplaySubject(100, null, scheduler);

        const runner = cli.default({
            input: ['run', 'js'],
            flags: {
                scheduler: scheduler,
                outputObserver: obs
            }
        }, {
            tasks: {
                'js@p': [t100, t100]
            }
        });

        // test output
        obs
            .filter(x => x.origin === 'Summary')
            .take(3)
            .toArray()
            .subscribe(function (data) {
                assert.include(data[1].data, '0.10s'); // 1s + 2 parallel at 100ms each === 1.10s
            });

        const out     = scheduler.startScheduler(() => runner, {created: 0, subscribed: 0, disposed: 4000});
        const reports = out.messages[0].value.value.reports;

        assert.equal(reports[0].type, 'start');
        assert.equal(reports[1].type, 'start');
        assert.equal(reports[2].type, 'end');
        assert.equal(reports[3].type, 'end');
    });
    it("css js [1 [2, 3]]", function () {
        const scheduler  = new Rx.TestScheduler();
        const obs        = new Rx.ReplaySubject(100, null, scheduler);

        const runner = cli.default({
            input: ['run', 'css', 'js'],
            flags: {
                scheduler: scheduler,
                outputObserver: obs
            }
        }, {
            tasks: {
                css: t1000,
                'js@p': [t100, t100]
            }
        });

        // test output
        obs
            .filter(x => x.origin === 'Summary')
            .take(3)
            .toArray()
            .subscribe(function (data) {
                assert.include(data[1].data, '1.10s'); // 1s + 2 parallel at 100ms each === 1.10s
            });

        const out     = scheduler.startScheduler(() => runner, {created: 0, subscribed: 0, disposed: 4000});
        const reports = out.messages[0].value.value.reports;

        assert.equal(reports[0].type, 'start', 'css start');
        assert.equal(reports[1].type, 'end',   'css end');
        assert.equal(reports[2].type, 'start', 'js01 start');
        assert.equal(reports[3].type, 'start', 'js02 start');
        assert.equal(reports[4].type, 'end',   'js01 end');
        assert.equal(reports[5].type, 'end' ,  'js02 end');
    });
    it.only("css js@p other [1 [2, 3] 4]", function () {

        const out     = run({
            input: ['run', 'css', 'js', 'other']
        }, {
            tasks: {
                css: t1000,
                'js@p': [t100, t100],
                other: t100
            }
        });

        const reports = out.messages[0].value.value.reports;

        assert.equal(reports[0].type, 'start');
        assert.equal(reports[1].type, 'end');

        assert.equal(reports[2].type, 'start');
        assert.equal(reports[3].type, 'start');
        assert.equal(reports[4].type, 'end');
        assert.equal(reports[5].type, 'end');

        assert.equal(reports[6].type, 'start');
        assert.equal(reports[7].type, 'end');
    });
});
