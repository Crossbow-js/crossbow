const assert = require('chai').assert;
const exec = require('child_process').exec;

describe("overrides from external file", function () {
    it('accepts overrides from external input file', function (done) {
        exec("node dist/cb run '@npm sleep 0.1' -i test/fixtures/inputs/1.yaml", function (err, stdout) {
            if (err) return done(err);
            assert.include(stdout, '+ @npm sleep 0.1');
            assert.include(stdout, '✔ @npm sleep 0.1');
            done();
        });
    });
});
