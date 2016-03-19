const assert = require('chai').assert;
const cli = require("../");
const errorTypes = require('../dist/task.errors').TaskErrorTypes;

describe('Running in series', function () {
    it('reports task start/end status', function (done) {
        this.timeout(10000);
        const runner = cli.runner(['@npm sleep 0.1', '@npm sleep 0.2']);
        var sub = runner
            .series()
            .map(x => {
                return {type: x.type, seqUID: x.item.seqUID};
            })
            .subscribe(function (report) {
                console.log('>', report);
            }, function () {
                // errors
            }, function () {
                sub.dispose();
                done();
            });
    });
    it('propagates errors correctly', function (done) {
        this.timeout(10000);
        const runner = cli.runner(['@npm sleep', '@npm sleep 0.2']);
        var messages = [];
        var sub = runner
            .series()
            .map(x => {
                return {type: x.type, seqUID: x.item.seqUID};
            })
            .subscribe(function (report) {
                messages.push(report);
            }, function (e) {
                assert.equal(messages.length, 2);
                assert.deepEqual(messages[0].seqUID, messages[1].seqUID);
                assert.deepEqual(messages[0].type, 'start');
                assert.deepEqual(messages[1].type, 'error');
                sub.dispose();
                done();
            }, function () {
                sub.dispose();
                done();
            });
    });
});
