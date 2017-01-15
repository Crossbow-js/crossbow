const assert = require('chai').assert;
const configMerge = require("../../../dist/config").merge;
const getInputs = require("../../../dist/input.resolve").getInputs;

describe('Choosing which input strategy to use', function () {
    it('returns multiple types when available', function () {
        const inputs = getInputs(configMerge({cwd: 'examples'}));
        assert.equal(inputs.sources.length, 2);
        assert.equal(inputs.sources[0].parsed.base, 'crossbow.yaml');
        assert.equal(inputs.sources[1].parsed.base, 'crossbow.js');
    });
    it('never looks for defaults when -i flag given', function () {
        const inputs = getInputs(configMerge({
            input: ['test/fixtures/bs-config.js']
        }));
        assert.equal(inputs.sources.length, 1);
        assert.equal(inputs.sources[0].parsed.base, 'bs-config.js');
    });
    it('returns default obj when no flag or default available', function () {
        const inputs = getInputs(configMerge({
            cwd: 'test/fixtures/css'
        }));
        assert.equal(inputs.sources.length, 0);
        assert.equal(inputs.inputs.length, 1);
    });
});
