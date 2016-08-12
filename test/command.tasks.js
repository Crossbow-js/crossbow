const assert = require('chai').assert;
const cli = require("../");
const TaskTypes = require("../dist/task.resolve").TaskTypes;
const exec = require("child_process").exec;

describe('Command: Tasks', function () {
    it.only('Show show tasks from current CWD', function (done) {
        exec('node dist/index tasks --cwd test/fixtures/tasks-command', function (err, sdtout) {
            console.log(sdtout);
            done();
        });
    });
});
