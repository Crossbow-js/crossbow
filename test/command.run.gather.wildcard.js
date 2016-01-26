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

describe('Gathering run tasks with widlcard', function () {
    it('can handle multi tasks with wildcard', function (done) {

    	var runner = handoff(['test/fixtures/tasks/single-export.js:*'], {
            crossbow: {
                config: {
                    "test/fixtures/tasks/single-export.js": {
                        site: {
                            input: ['css/core.scss']
                        },
                        ie: {
                            input: ['css/ie.scss']
                        }
                    }
                }
            }
        });

        assert.equal(runner.sequence.length, 2);

        done();
    });
});
