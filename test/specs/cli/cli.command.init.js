const assert  = require('chai').assert;
const exec    = require('child_process').execSync;
const rimraf  = require('rimraf');
const fs      = require('fs');

describe("CLI command.init", function () {
    it.only("init works", function () {

        require('rimraf').sync('test/fixtures/init/crossbow.yaml');

        const out = exec(`node dist/cb init --cwd test/fixtures/init`);

        assert.ok(fs.existsSync('test/fixtures/init/crossbow.yaml'));
        require('rimraf').sync('test/fixtures/init/crossbow.yaml');

        // const output   = 'test/fixtures/outputs/new.md';
        // const input    = 'test/fixtures/inputs/docs.yaml';
        // const expected = 'test/fixtures/outputs/new-expected.md';
        //
        // rimraf.sync(output);
        //
        // const out = exec(`node dist/cb docs -c ${input} --output ${output}`);
        //
        // assert.include(out.toString(), 'Docs added to: test/fixtures/outputs/new.md');
        //
        // assert.equal(read(output, 'utf8'), read(expected, 'utf8'), 'New file matches expected');
        //
        // rimraf.sync(output);
    });
});
