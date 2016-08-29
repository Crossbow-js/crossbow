const assert = require('chai').assert;
const exec = require('child_process').exec;

describe("Performing a dry-run", function () {
    it("it fakes the execution of tasks", function (done) {
        exec(`node dist/index run '@npm printenv' --dryRun --dryRunDuration=10`, function (err, stdout) {
            assert.ok(stdout.split('\n').length < 10, 'printenv would normally produce many line');
            done();
        });
    });
});
