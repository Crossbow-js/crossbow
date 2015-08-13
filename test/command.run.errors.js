var assert = require('chai').assert;
var watch = require('../lib/command.watch');
var cwd = require('path').resolve('test/fixtures');
var current = process.cwd();
var resolve = require('path').resolve;
var gather = require('../lib/command.copy').gatherCopyTasks;
var getBsConfig = require('../lib/utils').getBsConfig;
var cli = require("../cli");

function testCase (command, input, cb) {
    cli({input: command}, input, cb);
}

describe('Gathering run tasks', function () {
    it.only('can recover from errors correctly', function (done) {
        cli({
            input: ["run", "examples/tasks/error.js"]
        }, {
            crossbow: {
                config: {
                    "examples/tasks/simple.js": {
                        "name": "shane"
                    }
                }
            }
        }, function (err, output) {
            //assert.equal(output.sequence.length, 2);
            //assert.equal(output.sequence[0].fns.length, 1);
            //assert.equal(output.sequence[0].opts.name, "shane");
            done();
        });
    });
});