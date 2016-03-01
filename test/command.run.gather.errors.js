const assert = require('chai').assert;
const cli = require("../");
const errorTypes = require('../dist/task.errors').TaskErrorTypes;

describe('Gathering run tasks with errors', function () {
    it('reports single missing module', function () {
    	const runner = cli.getRunner(['list']);
        assert.equal(runner.tasks.invalid[0].errors[0].type, 0);
    });
    it('reports multiple missing modules', function () {
    	const runner = cli.getRunner(['list', 'otheraswell']);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.ModuleNotFound);
        assert.equal(runner.tasks.invalid[0].taskName, 'list');
        assert.equal(runner.tasks.invalid[1].errors[0].type, errorTypes.ModuleNotFound);
        assert.equal(runner.tasks.invalid[1].taskName, 'otheraswell');
    });
    it('reports multiple missing modules plus missing subtask config', function () {
    	const runner = cli.getRunner(['list:someconfig', 'uglifry']);

        assert.equal(runner.tasks.invalid[0].errors.length, 2);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.ModuleNotFound);
        assert.equal(runner.tasks.invalid[0].errors[1].type, errorTypes.SubtasksNotInConfig);

        assert.equal(runner.tasks.invalid[1].errors.length, 1);
        assert.equal(runner.tasks.invalid[1].errors[0].type, errorTypes.ModuleNotFound);
    });
    it('reports when subtask not given', function () {
    	const runner = cli.getRunner(['test/fixtures/tasks/simple.js:']);
        assert.equal(runner.tasks.invalid[0].errors.length, 1);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.SubtaskNotProvided);
    });
    it('reports when subtask not found', function () {
    	const runner = cli.getRunner(['test/fixtures/tasks/simple.js:dev'], {config: {
            'test/fixtures/tasks/simple.js': {shane:'here'}
        }});
        assert.equal(runner.tasks.invalid[0].errors.length, 1);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.SubtaskNotFound);
    });
    it('reports when subtask as * given, but not config exists', function () {
    	const runner = cli.getRunner(['test/fixtures/tasks/simple.js:*'], {config: {}});
        assert.equal(runner.tasks.invalid[0].errors.length, 1);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.SubtaskWildcardNotAvailable);
    });
    it('reports when @flag is present, but no flag given ', function () {
    	const runner = cli.getRunner(['test/fixtures/tasks/simple.js@'],{
            config: {}
        });
        assert.equal(runner.tasks.invalid[0].errors.length, 1);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.FlagNotProvided);
    });
    it('reports when @flag is present, but no flag given + module error ', function () {
        const runner = cli.getRunner(['test/fixtures/tasks/NOTEXIST.js@'],{
            config: {}
        });
        assert.equal(runner.tasks.invalid[0].errors.length, 2);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.ModuleNotFound);
        assert.equal(runner.tasks.invalid[0].errors[1].type, errorTypes.FlagNotProvided);
    });
});
