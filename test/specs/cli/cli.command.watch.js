const exec = require('child_process').exec;

describe("watch command", function () {
    it("Reports when no watchers available", function (done) {
        exec('node dist/cb watch --cwd test', function (err) {
            if (err) return done(err);
            done();
        });
    });
});
