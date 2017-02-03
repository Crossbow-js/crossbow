const assert = require('chai').assert;
const utils = require("../../utils");
const yaml = require("js-yaml");

const TaskRunModes = require('../../../dist/task.resolve').TaskRunModes;
const TaskTypes = require('../../../dist/task.resolve').TaskTypes;
const TaskErrors = require('../../../dist/task.errors').TaskErrorTypes;
const TaskOriginTypes = require('../../../dist/task.resolve').TaskOriginTypes;

describe('Gathering run tasks from bin directory', function () {
    it('can gather tasks from a bin dir', function () {
        const runner = utils.getSetup(['js'], {
            tasks: {
                js: 'webpack --config webpack.prod.js'
            },
            options: {},
            config: {
                bin: [
                    'node_modules/.bin'
                ]
            }
        });

        assert.equal(runner.tasks.valid[0].taskName, 'js');
        assert.equal(runner.tasks.valid[0].tasks[0].taskName, 'webpack --config webpack.prod.js');
        assert.equal(runner.tasks.valid[0].tasks[0].type, TaskTypes.Adaptor);
        assert.equal(runner.tasks.valid[0].tasks[0].adaptor, 'sh');
    });
});
