const assert = require('chai').assert;
const cli = require("../");
const TaskTypes = require("../dist/task.resolve").TaskTypes;
const exec = require("child_process").exec;

describe('Command: Tasks', function () {
    it('Should show tasks from current CWD + /tasks', function (done) {
        exec('node dist/index tasks --cwd test/fixtures/tasks-command', function (err, stdout) {
            assert.include(stdout, 'tasks/test-01.js   Run via: test-01');
            assert.include(stdout, 'tasks/test-02.sh   Run via: test-02');
            done();
        });
    });
    it('Should show tasks from configured task dir', function (done) {
        exec('node dist/index tasks --tasksDir test/fixtures/tasks-command/tasks-02', function (err, stdout) {
            assert.include(stdout, 'test/fixtures/tasks-command/tasks-02/task-2-01.js   Run via: task-2-01');
            done();
        });
    });
    it('Should run task from configured task dir', function (done) {
        exec('node dist/index run task-2-01 --tasksDir test/fixtures/tasks-command/tasks-02', function (err, stdout) {
            assert.include(stdout, 'task-2-01 running');
            done();
        });
    });
    it('Should show tasks from configured task dir + configured cwd', function (done) {
        exec('node dist/index ls task-2-01 --cwd test/fixtures/tasks-command --tasksDir tasks-02', function (err, stdout) {
            assert.include(stdout, 'tasks-02/task-2-01.js   Run via: task-2-01');
            done();
        });
    });
    it('Should run task from configured task dir + configured cwd', function (done) {
        exec('node dist/index run task-2-01 --cwd test/fixtures/tasks-command --tasksDir tasks-02', function (err, stdout) {
            assert.include(stdout, 'task-2-01 running');
            done();
        });
    });
});
