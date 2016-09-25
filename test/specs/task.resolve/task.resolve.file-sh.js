const assert = require('chai').assert;
const utils = require("../../utils");
const TaskTypes = require("../../../dist/task.resolve").TaskTypes;
const TaskOriginTypes = require("../../../dist/task.resolve").TaskOriginTypes;
const fs = require("fs");
const rmrf = require("rimraf");

describe('task.resolve from .sh file path', function () {
    it('can create @shell adaptor from file', function () {
        const runner = utils.getRunner(['test/fixtures/files/run.sh']);
        assert.equal(runner.tasks.valid[0].type, TaskTypes.Adaptor);
        assert.equal(runner.tasks.valid[0].origin, TaskOriginTypes.FileSystem);
        assert.equal(runner.tasks.valid[0].adaptor, 'sh');
        assert.equal(runner.tasks.valid[0].command, '');
    });
    it('will read from disk at run time', function (done) {

        rmrf.sync('test/fixtures/files/sleep.sh');

        fs.writeFileSync('test/fixtures/files/sleep.sh', 'echo "1"');

        const runner = utils.getRunner(['test/fixtures/files/sleep.sh']);

        assert.equal(runner.tasks.valid[0].type, TaskTypes.Adaptor);
        assert.equal(runner.tasks.valid[0].origin, TaskOriginTypes.FileSystem);
        assert.equal(runner.tasks.valid[0].adaptor, 'sh');

        fs.writeFileSync('test/fixtures/files/sleep.sh', 'echo "2"');

        runner.runner
            .series()
            .last()
            .subscribe(function (reports) {
                done();
            });
    });
});
