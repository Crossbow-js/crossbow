const assert  = require('chai').assert;
const utils   = require('../../utils');

describe("Performing a dry-run", function () {
    it("it fakes the execution of tasks with time", function () {

        const runner = utils.run({
            input: ['run', 'css', 'js'],
            flags: {
                dryRun: true,
                dryRunDuration: 100
            }
        }, {
            tasks: {
                css: utils.task(1000),
                'js@p': [
                    utils.task(20000),
                    utils.task(3000000),
                ]

            }
        });

        runner.output
            .filter(x => x.origin === 'Summary')
            .take(3)
            .toArray()
            .subscribe(function (data) {
                assert.include(data[1].data, '0.20s'); // 1s + 2 parallel at 100ms each === 1.10s
            });

        const reports  = utils.getReports(runner);

        assert.equal(reports[0].type, 'start');
        assert.equal(reports[1].type, 'end');
        assert.equal(reports[1].stats.duration, 100);

        assert.equal(reports[2].type, 'start');
        assert.equal(reports[3].type, 'start');

        assert.equal(reports[4].type, 'end');
        assert.equal(reports[5].type, 'end');

        assert.equal(reports[4].stats.duration, 100);
        assert.equal(reports[5].stats.duration, 100);
    });
});
