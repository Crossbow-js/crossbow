const assert = require('chai').assert;
const cli = require("../");
const errorTypes = require('../dist/task.errors').TaskErrorTypes;

describe('Running in parallel', function () {
    it('reports task starts at correct time (ie: together)', function (done) {
        this.timeout(10000);
        const runner = cli.runner(['@npm sleep 0.1', '@npm sleep 0.2']);
        var sub = runner
            .parallel()
            .map(x => {
                return {type: x.type, seqUID: x.item.seqUID};
            })
            .toArray()
            .subscribe(function (report) {
                assert.equal(report[0].type, 'start');
                assert.equal(report[1].type, 'start');
                done();
            });
    });
    it('propagates error messages correctly (but does not cause siblings to fail)', function (done) {
        this.timeout(10000);
        const runner = cli.runner(['@npm sleep 1', '@npm sleep', '@npm sleep .5']);
        var sub = runner
            .parallel()
            .map(x => {
                return {type: x.type, seqUID: x.item.seqUID};
            })
            .toArray()
            .subscribe(function (report) {
                assert.equal(report[0].type, 'start');
                assert.equal(report[1].type, 'start');
                assert.equal(report[2].type, 'start');
                assert.equal(report[3].type, 'error');
                assert.equal(report[4].type, 'end');
                assert.equal(report[5].type, 'end');
            }, function (e) {
                console.log(e);
            }, function () {
                console.log('done');
                sub.dispose();
                done();
            });
    });
});
