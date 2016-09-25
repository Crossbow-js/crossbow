const assert  = require('chai').assert;
const exec    = require('child_process').execSync;
const rimraf  = require('rimraf');
const read  = require('fs').readFileSync;

describe("CLI command.docs", function () {
    it("works in cwd", function () {

        const output   = 'test/fixtures/outputs/new.md';
        const input    = 'test/fixtures/inputs/docs.yaml';
        const expected = 'test/fixtures/outputs/new-expected.md';

        rimraf.sync(output);

        const out = exec(`node dist/cb docs -c ${input} --output ${output}`);

        assert.include(out.toString(), 'Docs added to: test/fixtures/outputs/new.md');

        assert.equal(read(output, 'utf8'), read(expected, 'utf8'), 'New file matches expected');

        rimraf.sync(output);
    });
});
