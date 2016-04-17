const assert = require('chai').assert;
const preprocess = require('../dist/task.preprocess').preprocessTask;

describe('can pre-process incoming task names', function () {
    it('can handle simple tasks tasks', function () {
        assert.deepEqual(
            preprocess('file.js'),
            {
                cbflags: [],
                flags: {},
                baseTaskName: 'file.js',
                subTasks: [],
                runMode: 'series',
                rawInput: 'file.js',
                taskName: 'file.js',
                query: {},
                tasks: []
            }
        );
    });
    it('can handle single subtask', function () {

        const proc = preprocess('file.js:dev');
        assert.equal(proc.baseTaskName, 'file.js');
        assert.deepEqual(proc.subTasks, ['dev']);
        assert.deepEqual(proc.rawInput, 'file.js:dev');
        assert.deepEqual(proc.taskName, 'file.js');
    });
    it('can handle multi subtask', function () {
        const proc = preprocess('file.js:dev:site');
        assert.equal(proc.baseTaskName, 'file.js');
        assert.deepEqual(proc.subTasks, ['dev', 'site']);
        assert.deepEqual(proc.rawInput, 'file.js:dev:site');
        assert.deepEqual(proc.taskName, 'file.js');
    });
    it('can handle single handle @p flag', function () {
        const proc = preprocess('file.js@p');
        assert.deepEqual(proc.cbflags, ['p']);
        assert.deepEqual(proc.baseTaskName, 'file.js');
        assert.deepEqual(proc.rawInput, 'file.js@p');
    });
    it('can handle multiple flags', function () {
        const proc = preprocess('file.js@pa');
        assert.deepEqual(proc.cbflags, ['p', 'a']);
        assert.deepEqual(proc.baseTaskName, 'file.js');
        assert.deepEqual(proc.rawInput, 'file.js@pa');
    });
    it('can handle missing flag', function () {
        const proc = preprocess('file.js@');
        assert.deepEqual(proc.cbflags, ['']);
    });
    it('can handle @p flag with subtasks', function () {
        const proc = preprocess('file.js:dev:site@pa');
        assert.deepEqual(proc.cbflags, ['p', 'a']);
        assert.deepEqual(proc.subTasks, ['dev', 'site']);
        assert.deepEqual(proc.rawInput, 'file.js:dev:site@pa');
        assert.deepEqual(proc.taskName, 'file.js');
    });
    it('can handle query params', function () {
        const proc = preprocess('crossbow-sass?input=shane');
        assert.deepEqual(proc.baseTaskName, 'crossbow-sass');
        assert.deepEqual(proc.rawInput, 'crossbow-sass?input=shane');
        assert.deepEqual(proc.taskName, 'crossbow-sass');
        assert.deepEqual(proc.query, {input: 'shane'});
    });
    it('can handle query params with flags', function () {
        const proc = preprocess('crossbow-sass?input=shane@p');
        assert.deepEqual(proc.cbflags, ['p']);
        assert.deepEqual(proc.baseTaskName, 'crossbow-sass');
        assert.deepEqual(proc.rawInput, 'crossbow-sass?input=shane@p');
        assert.deepEqual(proc.taskName, 'crossbow-sass');
        assert.deepEqual(proc.query, {input: 'shane'});
    });
    it('can handle query params with flags and sub-tasks', function () {
        const proc = preprocess('crossbow-sass:shane:kittie?input=core.min.css@p');
        assert.deepEqual(proc.query, {input: 'core.min.css'});
        assert.deepEqual(proc.cbflags, ['p']);
        assert.deepEqual(proc.baseTaskName, 'crossbow-sass');
        assert.deepEqual(proc.subTasks, ['shane', 'kittie']);
        assert.deepEqual(proc.rawInput, 'crossbow-sass:shane:kittie?input=core.min.css@p');
        assert.deepEqual(proc.taskName, 'crossbow-sass');
    });
    it('can single handle cli flags', function () {
        const proc = preprocess('crossbow-sass --env=dev');
        assert.deepEqual(proc.flags, {env: 'dev'});
        assert.deepEqual(proc.rawInput, 'crossbow-sass --env=dev');
        assert.deepEqual(proc.taskName, 'crossbow-sass');
    });
    it('can single handle cli flags with dots', function () {
        const proc = preprocess('crossbow-sass --my.env=dev');
        assert.deepEqual(proc.flags, {
            my: {env: 'dev'}
        });
        assert.deepEqual(proc.rawInput, 'crossbow-sass --my.env=dev');
        assert.deepEqual(proc.taskName, 'crossbow-sass');
    });
    it('can single handle cli flags with dots', function () {
        const proc = preprocess('crossbow-sass --my.array=shane --my.array=kittie');
        console.log(proc.flags);
        assert.deepEqual(proc.flags, {
            my: {array: ['shane', 'kittie']}
        });
    });
});
