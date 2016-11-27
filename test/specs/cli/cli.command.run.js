const assert    = require('chai').assert;
const exec      = require("child_process").exec;

describe.only('Command: Tasks', function () {
    it('Should run task from configured task dir', function (done) {
        exec('node dist/cb run task-2-01 --tasksDir test/fixtures/tasks-command/tasks-02', function (err, stdout) {
            assert.include(stdout, 'task-2-01 running');
            done();
        });
    });
    it('Should run task from configured task dir + configured cwd', function (done) {
        exec('node dist/cb run task-2-01 --cwd test/fixtures/tasks-command --tasksDir tasks-02', function (err, stdout) {
            assert.include(stdout, 'task-2-01 running');
            done();
        });
    });
});
