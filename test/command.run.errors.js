var assert = require('chai').assert;
var watch = require('../lib/command.watch');
var cwd = require('path').resolve('test/fixtures');
var current = process.cwd();
var resolve = require('path').resolve;
var getBsConfig = require('../lib/utils').getBsConfig;
var cli = require("../cli");

function testCase (command, input, cb) {
    cli({input: command}, input, cb);
}

describe('Gathering run tasks', function () {
    it.skip('can recover from errors correctly', function (done) {
        cli({
            input: ["run", "test/fixtures/tasks/error.js"]
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