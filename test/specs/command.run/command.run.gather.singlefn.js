const assert = require('chai').assert;
const utils          = require('../../utils');

describe('Gathering run tasks with single fn export', function () {
    it('can handle single fn', function () {
    	const runner = utils.getRunner(['test/fixtures/tasks/single-export.js']);
        assert.equal(runner.sequence[0].fnName, 'singleExport');
    });
});
