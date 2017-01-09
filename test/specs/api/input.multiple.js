const assert = require("chai").assert;
const utils  = require("../../utils");
const Rx     = require('rx');

describe('Choosing merging multiple input types', function () {
    it('uses right fold to merge inputs', function () {
        const runner = utils.run({
            input: ['run', 'css'],
            flags: {
                input: [
                    'test/fixtures/inputs/1.yaml',
                    'test/fixtures/inputs/2.yaml',
                    {
                        tasks: {
                            css: function (opts, ctx) {
                                return Rx.Observable.just('done').delay(Number(ctx.input.env.SLEEP) * 1000, ctx.config.scheduler);
                            }
                        }
                    }
                ]
            }
        });

        const reports  = utils.getReports(runner);
        assert.equal(reports[1].stats.duration, 2000);
    });
});
