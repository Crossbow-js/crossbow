const assert = require('chai').assert;
const utils = require("../../utils");
const TaskTypes = require("../../../dist/task.resolve").TaskTypes;
const TaskRunModes = require("../../../dist/task.resolve").TaskRunModes;
const SequenceItemTypes = require("../../../dist/task.sequence.factories").SequenceItemTypes;

describe('task.resolve (inline-functions)', function () {
    it('with inline functions', function () {
        const runner = utils.getSetup(['js --shane'], {
            tasks: {
                js: function () {
                    // console.log('f11');
                }
            }
        });
        assert.equal(runner.tasks.valid[0].runMode, TaskRunModes.series);
        assert.equal(runner.tasks.valid[0].flags.shane, true);
    });
    it('with multiple inline functions', function () {
        const runner = utils.getSetup(['js'], {
            tasks: {
                js: ['shane', 'kittie'],
                shane: function ()  {},
                kittie: function () {}
            }
        });
        assert.equal(runner.tasks.valid[0].tasks.length, 2);
        assert.equal(runner.tasks.valid[0].type, TaskTypes.TaskGroup);
        assert.equal(runner.tasks.valid[0].runMode, TaskRunModes.series);
        assert.equal(runner.tasks.valid[0].tasks[0].tasks[0].type, TaskTypes.InlineFunction);
        assert.equal(runner.tasks.valid[0].tasks[1].tasks[0].type, TaskTypes.InlineFunction);
    });
    it('with multiple inline functions with cbflags', function () {
        const runner = utils.getSetup(['js@p'], {
            tasks: {
                js: ['shane', 'kittie'],
                shane: function ()  {},
                kittie: function () {}
            }
        });
        assert.equal(runner.tasks.valid[0].tasks.length, 2);
        assert.equal(runner.tasks.valid[0].type, TaskTypes.TaskGroup);
        assert.equal(runner.tasks.valid[0].runMode, TaskRunModes.parallel);
        assert.equal(runner.tasks.valid[0].tasks[0].tasks[0].type, TaskTypes.InlineFunction);
        assert.equal(runner.tasks.valid[0].tasks[1].tasks[0].type, TaskTypes.InlineFunction);
    });
    it('with flags', function () {
        const runner = utils.getSetup(['js'], {
            tasks: {
                js: ['shane --production', 'kittie?name=shane'],
                shane: function ()  {},
                kittie: function () {}
            }
        });
        assert.equal(runner.tasks.valid[0].tasks[0].flags.production, true);
        assert.equal(runner.tasks.valid[0].tasks[1].query.name, 'shane');
    });
    it('creates the correct sequence from tasks', function () {
        const runner = utils.getSetup(['js'], {
            tasks: {
                js: ['shane --production', 'kittie?name=shane'],
                shane: function ()  {},
                kittie: function () {}
            }
        });
        assert.equal(runner.sequence[0].type, SequenceItemTypes.SeriesGroup);
        assert.equal(runner.sequence[0].items.length, 2);
    });
    it('sends correct options from options', function () {
        const runner = utils.getSetup(['js:dev:kittie --production', 'test/fixtures/tasks/promise.js --name="shane"'], {
            options: {
                js: {
                    dev: {
                        name: "kittie"
                    },
                    kittie: {
                        name: "shane"
                    }
                }
            },
            tasks: {
                js: function () {

                }
            }
        });

        assert.equal(runner.sequence[0].type, SequenceItemTypes.SeriesGroup);
        assert.equal(runner.sequence[1].type, SequenceItemTypes.Task);

        assert.equal(runner.sequence[0].items.length, 2);
        assert.equal(runner.sequence[0].items[0].type, SequenceItemTypes.Task);
        assert.equal(runner.sequence[0].items[1].type, SequenceItemTypes.Task);

        assert.equal(runner.sequence[0].items[0].options.name, 'kittie');
        assert.equal(runner.sequence[0].items[1].options.name, 'shane');

        assert.equal(runner.sequence[1].options.name, 'shane');
    });
});
