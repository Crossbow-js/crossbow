const assert = require('chai').assert;
const Rx = require('rx');
const cli = require("../");
const errorTypes = require('../dist/task.errors').TaskErrorTypes;

describe.skip('Running with task stats', function () {
    it('reports when a task is completed', function (done) {
    	const runner = cli.runner(['@npm sleep .2']);
        runner.series()
            .toArray()
            .subscribe(trs => {
                assert.equal(trs.length, 2);
                assert.equal(trs[0].type, 'start');
                assert.equal(trs[1].type, 'end');
                done();
            })
    });
    it('reports when a task gives error', function (done) {
    	const runner = cli.runner(['test/fixtures/tasks/error.js']);
        runner.series()
            .catch(x => Rx.Observable.empty())
            .toArray()
            .subscribe(trs => {
                assert.equal(trs.length, 2);
                assert.equal(trs[0].type, 'start');
                assert.equal(trs[1].type, 'end');
                assert.equal(trs[1].stats.errors.length, 1);
                done();
            });
    });
    it.skip('does not continue running sibling tasks when one fails', function (done) {
        const runner = cli.runner(['test/fixtures/tasks/error.js', '@npm sleep 0']);
        // runner.series()
        //     .catch(x => Rx.Observable.empty())
        //     .toArray()
        //     .subscribe(trs => {
        //         assert.equal(trs.length, 2); // should not run next task
        //         assert.equal(trs[0].type, 'start');
        //         assert.equal(trs[0].item.seqUID, 0);
        //         assert.equal(trs[1].type, 'error');
        //         assert.equal(trs[1].item.seqUID, 0);
        //         done();
        //     });
        done();
    });
    it.skip('DOES continue running sibling tasks when one fails but runMode is parallel', function (done) {

        const runner = cli.getRunner(['js', 'npm'], {
            tasks: {
                js: ['someother'],
                someother: ['ppp'],
                ppp: ['test/fixtures/tasks/error.js'],
                npm: '@npm sleep .1'
            }
        }, {runMode: 'parallel'});

        tasks$
            .toArray()
            .subscribe(trs => {
                //console.log(trs);
                //assert.equal(trs[0].type, 'start');
                //assert.equal(trs[1].type, 'start');
                //assert.equal(trs[2].type, 'error');
                //assert.equal(trs[3].type, 'end');
                done();
            });
    });
});
