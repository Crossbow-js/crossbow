const assert = require("chai").assert;
const cli    = require("../");

describe('Choosing merging multiple input types', function () {
    it('uses right fold to merge inputs', function (done) {
        const runner = cli.getRunner(['@sh sleep $SLEEP'], {}, {
            config: ['test/fixtures/inputs/1.yaml', 'test/fixtures/inputs/2.yaml']
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function (reports) {
                const runtime = reports[1].stats.duration;
                assert.ok(runtime > 200, 'should take longer than 200ms');
                assert.ok(runtime < 300, 'should be less than 300ms');
                done();
            });
    });
    it('uses right fold to merge inputs (3 files)', function (done) {
        const runner = cli.getRunner(['@sh sleep $SLEEP'], {}, {
            config: [
                'test/fixtures/inputs/1.yaml',
                'test/fixtures/inputs/2.yaml',
                'test/fixtures/inputs/3.prod.js'
            ]
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function (reports) {
                const runtime = reports[1].stats.duration;
                assert.ok(runtime > 300, 'should take longer than 300ms');
                assert.ok(runtime < 400, 'should be less than 400ms');
                done();
            });
    });
    it('uses right fold to merge inputs (alt)', function (done) {
        const runner = cli.getRunner(['@sh sleep $SLEEP'], {}, {
            config: [
                'test/fixtures/inputs/3.prod.js',
                'test/fixtures/inputs/1.yaml',
                'test/fixtures/inputs/2.yaml',
            ]
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function (reports) {
                const runtime = reports[1].stats.duration;
                assert.ok(runtime > 200, 'should take longer than 200ms');
                assert.ok(runtime < 300, 'should be less than 300ms');
                done();
            });
    });
});
