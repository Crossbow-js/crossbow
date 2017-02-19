const assert = require('chai').assert;
const exec = require('child_process').exec;

const file1 = 'test/fixtures/env_file/.env';
const file2 = 'test/fixtures/env_file/package.json';

describe("adding environment variables at run time from a file", function () {
    it("it accepts .json files", function (done) {
        exec(`node dist/cb run '@sh echo $version' --envFile ${file2} -q`, function (err, stdout) {
            assert.equal(stdout, '4.0.13\n'); // from the package.json file
            done();
        });
    });
    it("it accepts plain text file", function (done) {
        exec(`node dist/cb run '@sh echo $NAME--$kittie' --envFile ${file1} -q`, function (err, stdout) {
            assert.equal(stdout, 'shane--cat\n'); // from the package.json file
            done();
        });
    });
    it("it accepts a combination of file types", function (done) {
        exec(`node dist/cb run '@sh echo $NAME--$kittie--$version' --envFile ${file1} ${file2} -q`, function (err, stdout) {
            assert.equal(stdout, 'shane--cat--4.0.13\n'); // from the package.json file
            done();
        });
    });
    it("throws with error when file not found", function (done) {
        exec(`node dist/cb run '@sh echo $NAME' --envFile test/fixtures/env_file/typo.env -q`, function (err, stdout) {
            assert.equal(err.code, 1);
            assert.include(stdout, 'EnvFileNotFound'); // from the package.json file
            assert.include(stdout, 'test/fixtures/env_file/typo.env'); // from the package.json file
            done();
        });
    });
});
