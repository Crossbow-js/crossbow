const assert = require("chai").assert;
const cli    = require("../../");

describe('Parse errors on input files', function () {
    it('can report YAML parse error in a nice way', function () {
        assert.doesNotThrow(function () {
            cli.getRunner(['js'], {}, {
                config: ['test/fixtures/inputs/yaml-error.yml'],
                reporters: [function(){}]
            });
        });
    });
    it('can report JSON parse errors in a nice way', function () {
        assert.doesNotThrow(function () {
            cli.getRunner(['js'], {}, {
                config: ['test/fixtures/inputs/json-error.json']
            });
        });
    });
    it('can report JS parse errors in a nice way', function () {
        assert.doesNotThrow(function () {
            cli.getRunner(['js'], {}, {
                config: ['test/fixtures/inputs/js-error.js']
            });
        });
    });
});
