const assert = require('chai').assert;
const preprocess = require('../dist/task.preprocess').preprocessTask;

describe('can pre-process incoming task names', function () {

    it('can handle adaptor tasks', function () {
        assert.deepEqual(
            preprocess('@npm run shane'),
            {
                flags: [],
                baseTaskName: '@npm run shane',
                subTasks: [],
                runMode: 'series',
                rawInput: '@npm run shane',
                taskName: '@npm run shane',
                query: {},
                tasks: []
            }
        );
    });
    it('can handle simple tasks tasks', function () {
        assert.deepEqual(
            preprocess('file.js'),
            {
                flags: [],
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
        assert.deepEqual(
            preprocess('file.js:dev'),
            {
                flags: [],
                baseTaskName: 'file.js',
                subTasks: ['dev'],
                runMode: 'series',
                rawInput: 'file.js:dev',
                taskName: 'file.js',
                query: {},
                tasks: []
            }
        );
    });
    it('can handle multi subtask', function () {
        assert.deepEqual(
            preprocess('file.js:dev:site'),
            {
                flags: [],
                baseTaskName: 'file.js',
                subTasks: ['dev', 'site'],
                runMode: 'series',
                rawInput: 'file.js:dev:site',
                taskName: 'file.js',
                query: {},
                tasks: []
            }
        );
    });
    it('can handle single handle @p flag', function () {

        assert.deepEqual(
            preprocess('file.js@p'),
            {
                flags: ['p'],
                baseTaskName: 'file.js',
                subTasks: [],
                runMode: 'parallel',
                rawInput: 'file.js@p',
                taskName: 'file.js',
                query: {},
                tasks: []
            }
        );
    });
    it('can handle multiple flags', function () {

        assert.deepEqual(
            preprocess('file.js@psa'),
            {
                flags: ['p', 's', 'a'],
                baseTaskName: 'file.js',
                subTasks: [],
                runMode: 'parallel',
                rawInput: 'file.js@psa',
                taskName: 'file.js',
                query: {},
                tasks: []
            }
        );
    });
    it('can handle missing flag', function () {

        assert.deepEqual(
            preprocess('file.js@'),
            {
                flags: [''],
                baseTaskName: 'file.js',
                subTasks: [],
                runMode: 'series',
                rawInput: 'file.js@',
                taskName: 'file.js',
                query: {},
                tasks: []
            }
        );
    });
    it('can handle @p flag with subtasks', function () {
        assert.deepEqual(
            preprocess('file.js:dev:site@p'),
            {
                flags: ['p'],
                baseTaskName: 'file.js',
                subTasks: ['dev', 'site'],
                runMode: 'parallel',
                rawInput: 'file.js:dev:site@p',
                taskName: "file.js",
                query: {},
                tasks: []
            }
        );
    });
    it('can handle query params', function () {
        assert.deepEqual(
            preprocess('crossbow-sass?input=shane'),
            {
                flags: [],
                baseTaskName: 'crossbow-sass',
                subTasks: [],
                runMode: 'series',
                rawInput: 'crossbow-sass?input=shane',
                taskName: 'crossbow-sass',
                query: {input: 'shane'},
                tasks: []
            }
        );
    });
    it('can handle query params with flags', function () {
        assert.deepEqual(
            preprocess('crossbow-sass?input=shane@p'),
            {
                flags: ['p'],
                baseTaskName: 'crossbow-sass',
                subTasks: [],
                runMode: 'parallel',
                rawInput: 'crossbow-sass?input=shane@p',
                taskName: 'crossbow-sass',
                query: {input: 'shane'},
                tasks: []
            }
        );
    });
    it('can handle query params with flags and sub-tasks', function () {
        assert.deepEqual(
            preprocess('crossbow-sass:shane:kittie?input=core.min.css@p'),
            {
                flags: ['p'],
                baseTaskName: 'crossbow-sass',
                subTasks: ['shane', 'kittie'],
                runMode: 'parallel',
                rawInput: 'crossbow-sass:shane:kittie?input=core.min.css@p',
                taskName: 'crossbow-sass',
                query: {input: 'core.min.css'},
                tasks: []
            }
        );
    });
});
