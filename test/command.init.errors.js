const assert = require('chai').assert;
const handleIncoming = require("../dist/index").default;
const InitConfigFileErrorTypes = require('../dist/command.init').InitConfigFileErrorTypes;

describe('Init command', function () {
    it('returns errors when attempting to create a file in the same place as existing', function () {
        const out = handleIncoming({
            input: ['init'],
            flags: {handoff: true, cwd: 'test/fixtures', type: 'cbfile'}
        }, {});
        assert.equal(out.errors.length, 1);
        assert.equal(out.errors[0].type, InitConfigFileErrorTypes.InitConfigFileExists);
    });
    it.only('returns no errors when the file will be unique', function () {
        const out = handleIncoming({
            input: ['init'],
            flags: {handoff: true, cwd: 'test/fixtures', type: 'js'}
        }, {});
        assert.equal(out.errors.length, 0);
    });
});
