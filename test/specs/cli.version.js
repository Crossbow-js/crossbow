const assert = require('chai').assert;
const exec = require('child_process').exec;
const current = require('../../package.json').version;
const cli = require('../../dist/index');
const reports = require('../../dist/reporter.resolve');
const Rx = require('rx');

describe("Prints the version", function () {
    it("via --version flag", function (done) {
        exec(`node dist/index --version`, function (err, stdout) {
            assert.equal(stdout, `${current}\n`);
            done();
        });
    });
    it("reports tasks with @p", function (done) {
        const obs = new Rx.Subject();
        obs.filter(x => x.origin === reports.ReportTypes.SimpleTaskList)
            .take(4)
            .pluck('data')
            .toArray()
            .subscribe(function (logs) {
                assert.include(logs[1], 'build <p>');
                done();
            });
        cli.default({
            input: ['tasks'],
            flags: {
                outputObserver: obs,
            }
        }, {
            tasks: {
                'build@p': ['css', 'js'],
                css: function cssTask() {},
                js: function jsTask() {}
            }
        });
    });
    it("reports grouped tasks with @p", function () {

        const runner = require('../../').getRunner(['build'], {
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
