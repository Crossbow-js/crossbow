const assert = require('chai').assert;
const utils = require("../../utils");
const seq = require("../../../dist/task.sequence");
const types = require('../../../dist/task.runner').TaskReportType;

describe('Gathering completed stats', function () {
    it('can join stats to an error item + success in parallel', function () {
        var runner = utils.run({
            input: ['run', 'error', 'ok'],
            flags: {
                parallel: true
            }
        }, {
            tasks: {
                error: utils.error(5000),
                ok: utils.task(100)
            }
        });
        const reports  = utils.getReports(runner);

        assert.equal(reports[0].type, types.start);
        assert.equal(reports[1].type, types.start);

        assert.equal(reports[2].type, types.end);
        assert.equal(reports[3].type, types.error);
    });
});
