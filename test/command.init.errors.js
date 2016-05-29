const assert = require('chai').assert;
const fs = require('fs');
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
    it('returns errors when type is not supported', function () {
        const out = handleIncoming({
            input: ['init'],
            flags: {handoff: true, cwd: 'test/fixtures', type: 'cjbile'} // typo
        }, {});
        assert.equal(out.errors.length, 1);
        assert.equal(out.errors[0].type, InitConfigFileErrorTypes.InitConfigFileTypeNotSupported);
    });
    it('returns no errors when the file will be unique', function () {
        const out = handleIncoming({
            input: ['init'],
            flags: {handoff: true, cwd: 'test/fixtures/init', type: 'js'}
        }, {});
        assert.equal(out.errors.length, 0);
    });
    it('writes to default yaml file to disk', function () {
        require('rimraf').sync('test/fixtures/init/crossbow.yaml');
        const out = handleIncoming({
            input: ['init'],
            flags: {cwd: 'test/fixtures/init'}
        }, {});
        assert.equal(out.errors.length, 0);
        assert.ok(fs.existsSync('test/fixtures/init/crossbow.yaml'));
        require('rimraf').sync('test/fixtures/init/crossbow.yaml');
    });
    it('writes to with --type js file to disk', function () {
        require('rimraf').sync('test/fixtures/init/crossbow.js');
        const out = handleIncoming({
            input: ['init'],
            flags: {cwd: 'test/fixtures/init', type: 'js'}
        }, {});
        assert.equal(out.errors.length, 0);
        assert.ok(fs.existsSync('test/fixtures/init/crossbow.js'));
        require('rimraf').sync('test/fixtures/init/crossbow.js');
    });
    it('writes to with --type json file to disk', function () {
        require('rimraf').sync('test/fixtures/init/crossbow.json');
        const out = handleIncoming({
            input: ['init'],
            flags: {cwd: 'test/fixtures/init', type: 'json'}
        }, {});
        assert.equal(out.errors.length, 0);
        assert.ok(fs.existsSync('test/fixtures/init/crossbow.json'));
        require('rimraf').sync('test/fixtures/init/crossbow.json');
    });
    it('does not override existing cbfile.js', function () {
        const existing = fs.readFileSync('test/fixtures/cbfile.js', 'utf8');
        const out = handleIncoming({
            input: ['init'],
            flags: {cwd: 'test/fixtures', type: 'cbfile'}
        }, {});
        assert.equal(out.errors.length, 1);
        const afterMaybeWrite = fs.readFileSync('test/fixtures/cbfile.js', 'utf8');
        assert.deepEqual(existing, afterMaybeWrite);
    });
});
