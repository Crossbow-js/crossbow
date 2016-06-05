const assert = require('chai').assert;
const cli = require("../");
const configMerge = require("../dist/config").merge;
const getTaskTree = require("../dist/task.utils").getTaskTree;
const getInputs = require("../dist/input.resolve").getInputs;

describe('Simplifying stack traces', function () {
    it.skip('should remove internal errors', function (done) {
        const runner = cli.run(['js'], {
            tasks: {
                js: function () {
                    throw new Error('oops!');
                }
            }
        });

        // /Users/shakyshane/crossbow/crossbow-cli/node_modules/rx/dist/rx
        // /Users/shakyshane/crossbow/crossbow-cli/node_modules/immutable

        runner.subscribe(function () {
            console.log('Value');
        }, function () {
            // console.log('error');
        }, function () {
            console.log('ere');
            done();
        });
        // runner.runner
        //     .series()
        //     .toArray()
        //     .subscribe(reports => {
                // console.log(reports[1].stats.errors[0].stack);
                // done();
            // });
    });
});
