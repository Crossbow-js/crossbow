const utils = require('../../../dist/task.utils');
const fileUtils = require('../../../dist/file.utils');
const retrieveDefaultInputFiles = fileUtils.retrieveDefaultInputFiles;
const assert                    = require('chai').assert;

describe('Retrieving external input', function () {
    it('can use a examples/crossbow.yaml file when options flag given', function () {
        const files = fileUtils.readInputFiles(['test/fixtures/examples/crossbow.yaml'], process.cwd());
        assert.ok(files.valid[0].input.tasks.css);
    });
    it('returns useful errors if a file is not found', function () {
        const files = fileUtils.readInputFiles(['oops/typeos'], process.cwd());
        assert.equal(files.valid.length, 0);
        assert.equal(files.invalid.length, 1);
        assert.equal(files.invalid[0].errors[0].type, utils.InputErrorTypes.InputFileNotFound);
    });
});
