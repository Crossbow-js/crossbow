const assert = require('chai').assert;
const utils = require("../../utils");
const yaml = require("js-yaml");

const TaskRunModes = require('../../../dist/task.resolve').TaskRunModes;
const TaskTypes = require('../../../dist/task.resolve').TaskTypes;
const TaskErrors = require('../../../dist/task.errors').TaskErrorTypes;
const TaskOriginTypes = require('../../../dist/task.resolve').TaskOriginTypes;
const input = () => yaml.safeLoad(`
tasks: 
  (js):
    clean: 
      - '@npm rm -rf js/dist'
      - '@npm webpack'
    webpack: '@npm webpack'
    deploy: '@npm webpack'
`);

describe('Gathering run tasks for ParentGroups (1)', function () {
    it('can provide error when subtask not provided for ParentGroup', function () {
        const runner = utils.getSetup(['js'], input());
        assert.equal(runner.tasks.invalid[0].errors.length, 1);
        assert.equal(runner.tasks.invalid[0].errors[0].type, TaskErrors.SubtaskNotProvided);
    });
    it.only('can provide error when subtask missing for ParentGroup', function () {
        const runner = utils.getSetup(['js:clean'], input()); // typo
        // assert.equal(runner.tasks.invalid[0].errors.length, 1);
        // console.log(runner.tasks.invalid[0]);
        // assert.equal(runner.tasks.invalid[0].errors[0].type, TaskErrors.SubtaskNotFound);
        // console.log(runner.tasks.all[1].tasks[0]);
    });
});
