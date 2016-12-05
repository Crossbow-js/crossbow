const assert = require('chai').assert;
const fs = require('fs');
const path = require('path');
const utils = require("../../utils");
const InitConfigFileErrorTypes = require('../../../dist/command.init').InitConfigFileErrorTypes;

describe.only('Init command', function () {
    it('returns errors when attempting to create a file in the same place as existing', function () {
        const output = utils.getGenericSetup({
            input: ['init'],
            flags: {cwd: 'test/fixtures', type: 'cbfile'}
        }, {});
        assert.equal(output.errors.length, 1);
        assert.equal(output.errors[0].type, InitConfigFileErrorTypes.InitInputFileExists);
    });
    it('returns errors when type is not supported', function () {
        const output = utils.getGenericSetup({
            input: ['init'],
            flags: {cwd: 'test/fixtures', type: 'cjbile'} // typo
        }, {});
        assert.equal(output.errors.length, 1);
        assert.equal(output.errors[0].type, InitConfigFileErrorTypes.InitInputFileTypeNotSupported);
    });
    it('returns no errors when the file will be unique', function () {
        const output = utils.getGenericSetup({
            input: ['init'],
            flags: {cwd: 'test/fixtures/init', type: 'js'}
        }, {});
        assert.equal(output.errors.length, 0);
    });
    it('writes to default yaml file to disk', function () {
        const output = utils.getGenericSetup({
            input: ['init'],
            flags: {cwd: 'test/fixtures/init'}
        }, {});

        const expectedOutput   = path.resolve('test/fixtures/init', 'crossbow.yaml');
        const expectedTemplate = path.resolve('templates', 'crossbow.yaml');

        assert.equal(expectedOutput, output.outputFilePath);
        assert.equal(expectedTemplate, output.templateFilePath);
        assert.equal(output.outputFileName, 'crossbow.yaml');

        // require('rimraf').sync('test/fixtures/init/crossbow.yaml');
        // assert.equal(out.errors.length, 0);
        // assert.ok(fs.existsSync('test/fixtures/init/crossbow.yaml'));
        // require('rimraf').sync('test/fixtures/init/crossbow.yaml');
    });
    it('writes to with --type js file to disk', function () {
        const output = utils.getGenericSetup({
            input: ['init'],
            flags: {cwd: 'test/fixtures/init', type: 'js'}
        }, {});

        const expectedOutput   = path.resolve('test/fixtures/init', 'crossbow.js');
        const expectedTemplate = path.resolve('templates', 'crossbow.js');

        assert.equal(expectedOutput, output.outputFilePath);
        assert.equal(expectedTemplate, output.templateFilePath);
        assert.equal(output.outputFileName, 'crossbow.js');

        // require('rimraf').sync('test/fixtures/init/crossbow.js');
        // assert.equal(out.errors.length, 0);
        // assert.ok(fs.existsSync('test/fixtures/init/crossbow.js'));
        // require('rimraf').sync('test/fixtures/init/crossbow.js');
    });
    it('writes to with --type json file to disk', function () {
        const output = utils.getGenericSetup({
            input: ['init'],
            flags: {cwd: 'test/fixtures/init', type: 'json'}
        }, {});

        const expectedOutput   = path.resolve('test/fixtures/init', 'crossbow.json');
        const expectedTemplate = path.resolve('templates', 'crossbow.json');

        assert.equal(expectedOutput, output.outputFilePath);
        assert.equal(expectedTemplate, output.templateFilePath);
        assert.equal(output.outputFileName, 'crossbow.json');

        // require('rimraf').sync('test/fixtures/init/crossbow.json');
        // assert.equal(out.errors.length, 0);
        // assert.ok(fs.existsSync('test/fixtures/init/crossbow.json'));
        // require('rimraf').sync('test/fixtures/init/crossbow.json');
    });
    it('does not override existing cbfile.js', function () {
        const output = utils.getGenericSetup({
            input: ['init'],
            flags: {cwd: 'test/fixtures', type: 'cbfile'}
        }, {});

        assert.equal(output.errors.length, 1);

        // const expectedOutput   = path.resolve('test/fixtures/init', 'crossbow.json');
        // const expectedTemplate = path.resolve('templates', 'crossbow.json');
        //
        // assert.equal(expectedOutput, output.outputFilePath);
        // assert.equal(expectedTemplate, output.templateFilePath);
        // assert.equal(output.outputFileName, 'crossbow.json');

        // const existing = fs.readFileSync('test/fixtures/cbfile.js', 'utf8');
        // assert.equal(out.errors.length, 1);
        // const afterMaybeWrite = fs.readFileSync('test/fixtures/cbfile.js', 'utf8');
        // assert.deepEqual(existing, afterMaybeWrite);
    });
});
