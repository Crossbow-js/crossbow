const assert = require('chai').assert;
const cli = require("../");
const TaskTypes = require("../dist/task.resolve").TaskTypes;

describe('task.resolve (inline-functions)', function () {
    it('with inline functions', function () {
        const runner = cli.getRunner(['js --shane'], {
            tasks: {
                js: function () {
                    console.log('f11');
                }
            }
        });
        assert.equal(runner.tasks.valid[0].runMode, 'series');
        assert.equal(runner.tasks.valid[0].flags.shane, true);
    });
    it('with multiple inline functions', function () {
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: ['shane', 'kittie'],
                shane: function ()  {},
                kittie: function () {}
            }
        });
        assert.equal(runner.tasks.valid[0].tasks.length, 2);
        assert.equal(runner.tasks.valid[0].tasks[0].type, TaskTypes.InlineFunction);
        assert.equal(runner.tasks.valid[0].tasks[1].type, TaskTypes.InlineFunction);
    });
    it('with multiple inline functions with cbflags', function () {
        const runner = cli.getRunner(['js@p'], {
            tasks: {
                js: ['shane', 'kittie'],
                shane: function ()  {},
                kittie: function () {}
            }
        });
        assert.equal(runner.tasks.valid[0].tasks.length, 2);
        assert.equal(runner.tasks.valid[0].runMode, 'parallel');
        assert.equal(runner.tasks.valid[0].tasks[0].type, TaskTypes.InlineFunction);
        assert.equal(runner.tasks.valid[0].tasks[1].type, TaskTypes.InlineFunction);
    });
    it('with flags', function () {
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: ['shane --production', 'kittie?name=shane'],
                shane: function ()  {},
                kittie: function () {}
            }
        });
        assert.equal(runner.tasks.valid[0].tasks[0].flags.production, true);
        assert.equal(runner.tasks.valid[0].tasks[1].query.name, 'shane');
    });
});
