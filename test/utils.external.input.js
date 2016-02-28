const retrieveExternalInputFiles = require('../dist/task.utils').retrieveExternalInputFiles;
const assert                     = require('chai').assert;

describe('Retrieving external input', function () {
    it('can use a crossbow.yaml file in the cwd', function () {
        const files = retrieveExternalInputFiles({
            cwd: process.cwd()
        });

        assert.ok(files[0].input.tasks);
    });
    it('can use a examples/crossbow.yaml file when config flag given', function () {
        const files = retrieveExternalInputFiles({
            cwd: process.cwd(),
            config: 'examples/crossbow.yaml'
        });

        assert.ok(files[0].input.tasks.css);
    });
});