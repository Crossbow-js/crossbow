const assert = require('chai').assert;
const cli = require("../");
const TaskTypes = require("../dist/task.resolve").TaskTypes;
const exec = require("child_process").exec;

describe('Command: Tasks', function () {
    it('Show show tasks from current CWD + /tasks', function (done) {
        exec('node dist/index tasks --cwd test/fixtures/tasks-command', function (err, sdtout) {
            assert.include(sdtout, 'tasks/test-01.js   Run via: test-01');
            assert.include(sdtout, 'tasks/test-02.sh   Run via: test-02');
            done();
        });
    });
});
