const assert = require('chai').assert;
const watch = require('../lib/command.watch');
const cli = require("../");
const errorTypes = require('../dist/task.errors').TaskErrorTypes;

describe('Gathering run tasks with errors', function () {
    it('reports single missing module', function () {
    	const runner = cli({
            input: ['run', 'list'],
            flags: {handoff: true}
        }, {crossbow: {}});

        assert.equal(runner.tasks.invalid[0].errors[0].type, 0);
    });
    it('reports multiple missing modules', function () {
    	const runner = cli({
            input: ['run', 'list', 'otheraswell'],
            flags: {handoff: true}
        }, {crossbow: {}});

        assert.equal(runner.tasks.invalid[0].errors[0].type, 0);
        assert.equal(runner.tasks.invalid[0].taskName, 'list');
        assert.equal(runner.tasks.invalid[1].errors[0].type, 0);
        assert.equal(runner.tasks.invalid[1].taskName, 'otheraswell');
    });
    it('reports multiple missing modules plus missing subtask config', function () {
    	const runner = cli({
            input: ['run', 'list:someconfig', 'uglifry'],
            flags: {handoff: true}
        }, {crossbow: {}});

        assert.equal(runner.tasks.invalid[0].errors.length, 2);
        assert.equal(runner.tasks.invalid[0].errors[0].type, 0);
        assert.equal(runner.tasks.invalid[0].errors[1].type, 3);

        assert.equal(runner.tasks.invalid[1].errors.length, 1);
        assert.equal(runner.tasks.invalid[1].errors[0].type, 0);
    });
    it('reports when subtask not given', function () {
    	const runner = cli({
            input: ['run', 'test/fixtures/tasks/simple.js:'],
            flags: {handoff: true}
        }, {crossbow: {}});

        assert.equal(runner.tasks.invalid[0].errors.length, 1);
        assert.equal(runner.tasks.invalid[0].errors[0].type, 2);
    });
    it('reports when subtask not found', function () {
    	const runner = cli({
            input: ['run', 'test/fixtures/tasks/simple.js:dev'],
            flags: {handoff: true}
        }, {crossbow: {config: {
            'test/fixtures/tasks/simple.js': {}
        }}});
        assert.equal(runner.tasks.invalid[0].errors.length, 1);
        assert.equal(runner.tasks.invalid[0].errors[0].type, 3);
    });
    it('reports when subtask as * given, but not config exists', function () {
    	const runner = cli({
            input: ['run', 'test/fixtures/tasks/simple.js:*'],
            flags: {handoff: true}
        }, {crossbow: {config: {}}});
        assert.equal(runner.tasks.invalid[0].errors.length, 1);
        assert.equal(runner.tasks.invalid[0].errors[0].type, 1);
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
