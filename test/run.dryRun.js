const assert  = require('chai').assert;
const exec    = require('child_process').exec;
const reports = require('../dist/reporter.resolve');
const Rx      = require('rx/dist/rx.all');
const cli     = require('../dist/index');

describe("Performing a dry-run", function () {
    it("it fakes the execution of tasks", function (done) {
        exec(`node dist/index run '@npm printenv' --dryRun --dryRunDuration=10`, function (err, stdout) {
            assert.ok(stdout.split('\n').length > 10, 'printenv would normally produce many line');
            done();
        });
    });
    it("it fakes the execution of tasks with time", function () {
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
                css: function () {
                    return Rx.Observable.just('shane').delay(1000, scheduler);
                },
                'js@p': [
                    function () {
                        return Rx.Observable.just('shane').delay(100, scheduler);
                    },
                    function () {
                        return Rx.Observable.just('shane').delay(100, scheduler);
                    }
                ]

            }
        });

        obs
            .filter(x => x.origin === 'Summary')
            .take(3)
            .toArray()
            .subscribe(function (data) {
                assert.include(data[1].data, '1.10s'); // 1s + 2 parallel at 100ms each === 1.10s
            });

        const out = scheduler.startScheduler(function () {
            return runner;
        }, {created: 0, subscribed: 0, disposed: 4000});

        const reports = out.messages[0].value.value.reports;

        assert.equal(reports[0].type, 'start');
        assert.equal(reports[1].type, 'end');
        assert.equal(reports[2].type, 'start');
        assert.equal(reports[3].type, 'start');
        assert.equal(reports[4].type, 'end');
        assert.equal(reports[5].type, 'end');
    });
});
