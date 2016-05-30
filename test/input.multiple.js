const assert = require('chai').assert;
const configMerge = require("../dist/config").merge;
const getInputs = require("../dist/input.resolve").getInputs;

describe('Choosing merging multiple input types', function () {
    it('user right fold to merge inputs', function () {
        const inputs = getInputs(configMerge({
            config: ['test/fixtures/inputs/1.yaml', 'test/fixtures/inputs/2.yaml']
        }));
        assert.equal(inputs.inputs.length, 1); // crossbow.yaml in root
        assert.equal(inputs.sources[0].parsed.base, 'crossbow.yaml'); // crossbow.yaml in root
    });
});
