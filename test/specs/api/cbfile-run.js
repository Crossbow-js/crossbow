const assert = require('chai').assert;
const exec = require('child_process').exec;
const utils = require('../../utils');
const cb  = require('../../../dist/index')['default'];
const TaskTypes  = require('../../../dist/task.resolve').TaskTypes;
const TaskReportType = require('../../../dist/task.runner').TaskReportType;

const absPath  = require('path').resolve(__dirname, '..', '..', '..', 'dist', 'public', 'index.js');
const absPath3 = require('path').resolve(__dirname, '..', '..', '..', 'dist', 'public', 'create.js');
const absPath2 = require('path').resolve(__dirname, '..', '..', 'fixtures', 'cbfile.js');

describe('Using a cbfile', function () {
    beforeEach(function () {
        if (require.cache[absPath])  delete require.cache[absPath];
        if (require.cache[absPath2]) delete require.cache[absPath2];
        if (require.cache[absPath3]) delete require.cache[absPath3];
    });
    it('works with non-array inputs', function () {
    	const runner = cb({
            input: ['build-js'],
            flags: {
                handoff: true,
                outputObserver: utils.nullOutput(),
                cbfile: 'test/fixtures/cbfile.js'
            }
        });
        assert.equal(runner.tasks.valid[0].tasks.length, 2); //has a callback also
        assert.equal(runner.tasks.valid[0].tasks[0].type, TaskTypes.InlineFunction);
        assert.equal(runner.tasks.valid[0].tasks[1].type, TaskTypes.InlineFunction);
    });
    it('works with inline functions', function () {
    	const runner = cb({
            input: ['shane'],
            flags: {
                handoff: true,
                outputObserver: utils.nullOutput(),
                cbfile: 'test/fixtures/cbfile.js'
            }
        });
        assert.equal(runner.tasks.valid.length, 1);
        assert.equal(runner.tasks.valid[0].tasks.length, 2);
        assert.equal(runner.tasks.valid[0].tasks[0].rawInput, 'kittie');
        assert.equal(runner.tasks.valid[0].tasks[0].type, TaskTypes.InlineFunction);
        assert.equal(runner.tasks.valid[0].tasks[1].type, TaskTypes.InlineFunction);
    });
    it('works with options', function () {
        const runner = utils.run({
            input: ['kittie:dev'],
            flags: {
                outputObserver: utils.nullOutput(),
                cbfile: 'test/fixtures/cbfile.js'
            }
        });
        const reports = runner.subscription.messages[0].value.value.reports;
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.end);
        assert.equal(reports[1].stats.duration, 0);
    });
    it('works with top-level config', function () {
        const runner = utils.run({
            input: ['run', 'wait'],
            flags: {
                outputObserver: utils.nullOutput(),
                cbfile: 'test/fixtures/cbfile.js'
            }
        });
        const reports = runner.subscription.messages[0].value.value.reports;
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.end);
        assert.equal(reports[1].stats.duration, 3000);
    });
    it('works with top-level env', function () {
        const runner = utils.run({
            input: ['wait-env'],
            flags: {
                cbfile: 'test/fixtures/cbfile.js'
            }
        });
        const reports = runner.subscription.messages[0].value.value.reports;
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.end);
        assert.equal(reports[1].stats.duration, 3000);
    });
    it('runs with mix of array + fn + callbacks', function () {
        const runner = utils.run({
            input: ['build-js'],
            flags: {
                cbfile: 'test/fixtures/cbfile.js'
            }
        });

        const reports = runner.subscription.messages[0].value.value.reports;

        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.end);
        assert.equal(reports[2].type, TaskReportType.start);
        assert.equal(reports[3].type, TaskReportType.end);
    });
    it('runs with object in place of tasks deps', function () {
        const runner = utils.run({
            input: ['obj'],
            flags: {
                cbfile: 'test/fixtures/cbfile.js'
            }
        });
        const reports = runner.subscription.messages[0].value.value.reports;
        assert.equal(reports[0].type, TaskReportType.start);
        assert.equal(reports[1].type, TaskReportType.end);
        assert.equal(reports[1].stats.duration, 3000);
    });
    it('Propogates errors from CB file init', function (done) {
        exec(`node dist/cb tasks --cwd test/fixtures/inputs/cb-file-error`, function (err, stdout) {
            assert.include(stdout, 'File:    cbfile.js');
            assert.include(stdout, 'Error: Cannot find module \'-fs\'');
            done();
        });
    });
});
