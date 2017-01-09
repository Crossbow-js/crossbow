const assert = require('chai').assert;
const utils = require("../../utils");
const TaskRunModes = require("../../../dist/task.resolve").TaskRunModes;

describe('task.resolve (inline-functions within array)', function () {
    it('with inline functions', function () {
        const runner = utils.getSetup(['js'], {
            tasks: {
                js: [function shane() {

                }]
            }
        });
        assert.equal(runner.tasks.valid[0].runMode, TaskRunModes.series);
    });
});
