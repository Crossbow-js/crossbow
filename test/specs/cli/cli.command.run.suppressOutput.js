const assert = require('chai').assert;
const exec = require('child_process').exec;

describe("output: --suppressOutput", function () {
    it("can silence child_processes", function (done) {
        exec(`node dist/cb run '@npm echo "Some output \$(pwd)"' --suppressOutput`, function (err, stdout, stderr) {
            assert.notInclude(stdout, 'Some output /');
            done();
        });
    });
    it("does not silence child_processes by default", function (done) {
        exec(`node dist/cb run '@npm echo "Some output \$(pwd)"'`, function (err, stdout, stderr) {
            assert.include(stdout, 'Some output /');
            done();
        });
    });
});
