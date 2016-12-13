const assert = require('chai').assert;
const utils = require("../../utils");
const yaml = require("js-yaml");

const TaskTypes = require('../../../dist/task.resolve').TaskTypes;
const TaskErrors = require('../../../dist/task.errors').TaskErrorTypes;
const SequenceItemTypes = require('../../../dist/task.sequence.factories').SequenceItemTypes;
const input = () => yaml.safeLoad(`
tasks: 
  (js):
    clean: 
      - '@npm rm -rf js/dist'
      - '@npm webpack'
    webpack: '@npm webpack'
    deploy: '@npm webpack'
    
options:
  js:
    clean: 
      input: 'sacc'
      output: 'ohyeah'
`);

describe('Gathering run tasks for ParentGroups (1)', function () {
    it('can provide error when subtask not provided for ParentGroup', function () {
        const runner = utils.getSetup(['js'], input());
        assert.equal(runner.tasks.invalid[0].errors.length, 1);
        assert.equal(runner.tasks.invalid[0].errors[0].type, TaskErrors.SubtaskNotProvidedForParent);
    });
    it('can resolve sub task correctly', function () {
        const runner = utils.getSetup(['js:clean'], input());

        assert.equal(runner.tasks.valid[0].baseTaskName, 'js');
        assert.equal(runner.tasks.valid[0].type, TaskTypes.ParentGroup);
        assert.equal(runner.tasks.valid[0].tasks.length, 1);
        assert.equal(runner.tasks.valid[0].tasks[0].type, TaskTypes.TaskGroup);
        assert.equal(runner.tasks.valid[0].tasks[0].baseTaskName, 'clean');
        assert.equal(runner.tasks.valid[0].tasks[0].tasks.length, 2);
        assert.equal(runner.tasks.valid[0].tasks[0].tasks[0].type, TaskTypes.Adaptor);
        assert.equal(runner.tasks.valid[0].tasks[0].tasks[1].type, TaskTypes.Adaptor);

        assert.equal(runner.sequence[0].type, SequenceItemTypes.SeriesGroup);
        assert.equal(runner.sequence[0].items.length, 1);
        assert.equal(runner.sequence[0].items[0].type, SequenceItemTypes.SeriesGroup);
        assert.equal(runner.sequence[0].items[0].items.length, 2);
        assert.equal(runner.sequence[0].items[0].items[0].type, SequenceItemTypes.Task);
        assert.equal(runner.sequence[0].items[0].items[1].type, SequenceItemTypes.Task);
    });
    it('can resolve sub task correctly with flags', function () {
        let called = false;
        let callCount = 0;
        let args = [];
        const runner = utils.getRunner([
            'js:clean --production',
            'js:clean --name=shane',
            'js:clean?prod=true'
        ], {
            tasks: {
                '(js)': {
                    clean: function(opts) {
                        callCount++;
                        args.push(opts);
                        called = true;
                    }
                }
            }
        });

        runner.toArray()
            .subscribe(x => {
                assert.equal(args[0].production, true);
                assert.isUndefined(args[1].production);
                assert.equal(args[1].name, 'shane');
                assert.equal(args[2].prod, 'true');
                assert.equal(callCount, 3);
            });
    });
    it('can resolve wildcard subtasks', function () {
        const runner = utils.getSetup([
            'js:*'
        ], {
            tasks: {
                '(js)': {
                    clean: function() {},
                    someother: function () {}
                }
            }
        });
        assert.equal(runner.sequence[0].type, SequenceItemTypes.SeriesGroup);
        assert.equal(runner.sequence[0].items[0].type, SequenceItemTypes.SeriesGroup);
        assert.equal(runner.sequence[0].items[0].items[0].type, SequenceItemTypes.Task);
        assert.equal(runner.sequence[0].items[1].type, SequenceItemTypes.SeriesGroup);
        assert.equal(runner.sequence[0].items[1].items[0].type, SequenceItemTypes.Task);
    });
    it('can resolve sub task correctly when full format given eg: (js)', function () {
        const runner = utils.getSetup(['(js)'], input());
        assert.equal(runner.tasks.invalid[0].errors.length, 1);
        assert.equal(runner.tasks.invalid[0].errors[0].type, TaskErrors.SubtaskNotProvidedForParent);
    });
});
