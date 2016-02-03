var assert = require('chai').assert;
var watch = require('../lib/command.watch');
var cli = require("../cli");

describe('Running tasks with errors', function () {
    it.skip('can report missing task', function (done) {
        cli({
            input: ['run', 'test/fixtures/tasks/error.js']
        }, {
            crossbow: {
                config: {
                    "test/fixtures/tasks/simple.js": {
                        "name": "shane"
                    }
                }
            }
        }, function (err, output) {
            console.log(err);
            //assert.equal(output.sequence.length, 2);
            //assert.equal(output.sequence[0].fns.length, 1);
            //assert.equal(output.sequence[0].opts.name, "shane");
            done();
        });
    });
});