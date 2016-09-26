const assert  = require('chai').assert;
const exec    = require('child_process').execSync;
const rimraf  = require('rimraf');
const fs      = require('fs');

describe("CLI command.init", function () {
    it("init works with default crossbow.yaml file", function () {

        const outputFile = 'test/fixtures/init/crossbow.yaml';
        const template   = 'templates/crossbow.yaml';

        require('rimraf').sync(outputFile);

        exec(`node dist/cb init --cwd test/fixtures/init`);

        assert.equal(
            fs.readFileSync(template, 'utf8'),
            fs.readFileSync(outputFile, 'utf8')
        );

        require('rimraf').sync(outputFile);
    });
    it("init works with crossbow.js file", function () {

        const outputFile = 'test/fixtures/init/crossbow.js';
        const template   = 'templates/crossbow.js';

        require('rimraf').sync(outputFile);

        exec(`node dist/cb init --type js --cwd test/fixtures/init`);

        assert.equal(
            fs.readFileSync(template, 'utf8'),
            fs.readFileSync(outputFile, 'utf8')
        );

        require('rimraf').sync(outputFile);
    });
    it("init works with crossbow.json file", function () {

        const outputFile = 'test/fixtures/init/crossbow.json';
        const template   = 'templates/crossbow.json';

        require('rimraf').sync(outputFile);

        exec(`node dist/cb init --type json --cwd test/fixtures/init`);

        assert.equal(
            fs.readFileSync(template, 'utf8'),
            fs.readFileSync(outputFile, 'utf8')
        );

        require('rimraf').sync(outputFile);
    });
    it("init works with cbfile", function () {

        const outputFile = 'test/fixtures/init/cbfile.js';
        const template   = 'templates/cbfile.js';

        require('rimraf').sync(outputFile);

        exec(`node dist/cb init --type cbfile --cwd test/fixtures/init`);

        assert.equal(
            fs.readFileSync(template, 'utf8'),
            fs.readFileSync(outputFile, 'utf8')
        );

        require('rimraf').sync(outputFile);
    });
    it("handles unsupported types", function () {

        assert.throws(function () {
            exec(`node dist/cb init --type cb-file --cwd test/fixtures/init`);
        });
    });
});
