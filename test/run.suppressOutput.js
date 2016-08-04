const assert = require('chai').assert;
const exec = require('child_process').exec;

describe("output: --suppressOutput", function () {
    it("can silence child_processes", function (done) {
        exec(`node dist/index run '@npm echo "Some output \$(pwd)"' --suppressOutput`, function (err, stdout, stderr) {
            // assert.deepEqual(err.code, 1);
            assert.notInclude(stdout, 'Some output /');
            done();
        });
    });
    it("does not silence child_processes by default", function (done) {
        exec(`node dist/index run '@npm echo "Some output \$(pwd)"'`, function (err, stdout, stderr) {
            // assert.deepEqual(err.code, 1);
            assert.include(stdout, 'Some output /');
            done();
        });
    });
});
