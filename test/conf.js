const assert  = require('chai').assert;
const cli     = require("../cli");

describe('using flags', function () {
    it('can set runMode -> parallel with -p flag', function (done) {

        var runner = cli({
            input: ['run', '@npm ls'],
            flags: {
                handoff: true,
                p: true
            }
        }, {});

        assert.equal(runner.config.runMode, 'parallel');

        done();
    });
});
