const assert = require('chai').assert;
const exec = require('child_process').exec;
const cb  = require('../dist/index')['default'];
const TaskTypes  = require('../dist/task.resolve').TaskTypes;

describe('Using a cbfile', function () {
    it('works with non-array inputs', function () {
    	const runner = cb({
            input: ['build-js'],
            flags: {
                handoff: true,
                cbfile: 'test/fixtures/cbfile.js'
            }
        });
        assert.equal(runner.tasks.valid[0].tasks.length, 2); //has a callback also
        assert.equal(runner.tasks.valid[0].tasks[0].type, TaskTypes.Adaptor);
        assert.equal(runner.tasks.valid[0].tasks[0].command, 'webpack example.js');
    });
    it('works with inline functions', function () {
    	const runner = cb({
            input: ['shane'],
            flags: {
                handoff: true,
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
        const runner = cb({
            input: ['kittie:dev'],
            flags: {
                handoff: true,
                cbfile: 'test/fixtures/cbfile.js'
            }
        });
        assert.equal(runner.sequence[0].options.input, 'some/file.js');
    });
    it('works with top-level config', function (done) {
        const runner = cb({
            input: ['wait'],
            flags: {
                handoff: true,
                cbfile: 'test/fixtures/cbfile.js'
            }
        });
        var now = new Date().getTime();
        runner.runner
            .series()
            .toArray()
            .subscribe(x => {
                assert.ok(new Date().getTime() - now > 300);
                done();
            })
    });
    it('works with top-level env', function (done) {
        const runner = cb({
            input: ['wait-env'],
            flags: {
                handoff: true,
                cbfile: 'test/fixtures/cbfile.js'
            }
        });
        var now = new Date().getTime();
        runner.runner
            .series()
            .toArray()
            .subscribe(x => {
                assert.ok(new Date().getTime() - now > 300);
                done();
            })
    });
    it('runs with mix of array + non-array + fns', function (done) {
        const runner = cb({
            input: ['build-js'],
            flags: {
                handoff: true,
                cbfile: 'test/fixtures/cbfile.js'
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(x => {
                assert.equal(x.length, 4);
                x.forEach(x => console.log(x.type, x.item.task.baseTaskName));
                done();
            });
    });
    it('runs with object in place of tasks deps', function (done) {
        const runner = cb({
            input: ['obj'],
            flags: {
                handoff: true,
                cbfile: 'test/fixtures/cbfile.js'
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(reports => {
                assert.equal(reports.length, 2);
                done();
            });
    });
    it('Propogates errors from CB file init', function (done) {
        exec(`node dist/index tasks --cwd test/fixtures/inputs/cb-file-error`, function (err, stdout) {
            assert.include(stdout, 'File:    cbfile.js');
            assert.include(stdout, 'Error: Cannot find module \'-fs\'');
            done();
        });
    });
});
