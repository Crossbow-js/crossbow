var assert = require('chai').assert;
var watch = require('../lib/command.watch');
var cwd = require('path').resolve('test/fixtures');
var current = process.cwd();
var resolve = require('path').resolve;
var getBsConfig = require('../lib/utils').getBsConfig;
var cli = require('../cli');

function handoff (cmd, input, cb) {
    return cli({
        input: ['run'].concat(cmd),
        flags: {
            handoff: true
        }
    }, input, cb);
}

describe('Gathering run tasks with single fn export', function () {
    it('can handle single fn', function (done) {

    	var runner = handoff(['test/fixtures/tasks/single-export.js'], {
            crossbow: {}
        });

        runner.run.subscribe(function () {}, function (err) {
        	console.log(err);
        }, function () {
            assert.equal(runner.sequence[0].seq.taskItems.length, 1);
        	done();
        });
    });
});
