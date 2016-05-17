const assert = require('chai').assert;
const cli = require("../");
const TaskTypes = require("../dist/task.resolve").TaskTypes;
const TaskRunModes = require("../dist/task.resolve").TaskRunModes;
const SequenceItemTypes = require("../dist/task.sequence.factories").SequenceItemTypes;

describe('task.resolve from installed node_modules', function () {
    it('can retrieve task-name without using require()', function () {
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: 'test/fixtures/tasks/error.js'
            }
        });
        console.log(runner.tasks.valid[0].tasks[0]);
        // assert.equal(runner.tasks.valid[0].runMode, TaskRunModes.series);
    });
    // it('can retrieve task-name using require()', function () {
    //     const runner = cli.getRunner(['js'], {
    //         tasks: {
    //             js: 'crossbow-sass'
    //         }
    //     });
    //     console.log(runner.tasks.valid[0].tasks[0]);
    //     // assert.equal(runner.tasks.valid[0].runMode, TaskRunModes.series);
    // });
});
