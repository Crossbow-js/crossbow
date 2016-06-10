const assert = require('chai').assert;
const cli = require("../");
const errorTypes = require('../dist/task.errors').TaskErrorTypes;

describe('Gathering run tasks with errors', function () {
    it.only('reports single missing module', function () {
    	const runner = cli.getRunner(['list']);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.TaskNotFound);
    });
    it('reports unsupported file types', function () {
    	const runner = cli.getRunner(['test/fixtures/files/tast.rb']);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.FileTypeNotSupported);
    });
    it('reports multiple missing externalTasks', function () {
    	const runner = cli.getRunner(['list', 'otheraswell']);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.TaskNotFound);
        assert.equal(runner.tasks.invalid[0].taskName, 'list');
        assert.equal(runner.tasks.invalid[1].errors[0].type, errorTypes.TaskNotFound);
        assert.equal(runner.tasks.invalid[1].taskName, 'otheraswell');
    });
    it('reports multiple missing externalTasks plus missing subtask options', function () {
    	const runner = cli.getRunner(['list:someconfig', 'uglifry']);

        assert.equal(runner.tasks.invalid[0].errors.length, 2);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.TaskNotFound);
        assert.equal(runner.tasks.invalid[0].errors[1].type, errorTypes.SubtasksNotInConfig);

        assert.equal(runner.tasks.invalid[1].errors.length, 1);
        assert.equal(runner.tasks.invalid[1].errors[0].type, errorTypes.TaskNotFound);
    });
    it('reports when subtask not given', function () {
    	const runner = cli.getRunner(['test/fixtures/tasks/simple.js:']);
        assert.equal(runner.tasks.invalid[0].errors.length, 1);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.SubtaskNotProvided);
    });
    it('reports when subtask not found', function () {
    	const runner = cli.getRunner(['test/fixtures/tasks/simple.js:dev'], {options: {
            'test/fixtures/tasks/simple.js': {shane:'here'}
        }});
        assert.equal(runner.tasks.invalid[0].errors.length, 1);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.SubtaskNotFound);
    });
    it('reports when subtask as * given, but not options exists', function () {
    	const runner = cli.getRunner(['test/fixtures/tasks/simple.js:*'], {options: {}});
        assert.equal(runner.tasks.invalid[0].errors.length, 1);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.SubtaskWildcardNotAvailable);
    });
    it('reports when @flag is present, but no flag given ', function () {
    	const runner = cli.getRunner(['test/fixtures/tasks/simple.js@'],{
            options: {}
        });
        assert.equal(runner.tasks.invalid[0].errors.length, 1);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.FlagNotProvided);
    });
    it('reports when @flag is present, but no flag given + module error ', function () {
        const runner = cli.getRunner(['test/fixtures/tasks/NOTEXIST.js@'],{
            options: {}
        });
        assert.equal(runner.tasks.invalid[0].errors.length, 2);
        assert.equal(runner.tasks.invalid[0].errors[0].type, errorTypes.TaskNotFound);
        assert.equal(runner.tasks.invalid[0].errors[1].type, errorTypes.FlagNotProvided);
    });
});
