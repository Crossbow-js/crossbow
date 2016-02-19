const assert = require('chai').assert;
const preprocess = require('../dist/task.preprocess').default;

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
                taskName: '@npm run shane'
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
                taskName: 'file.js'
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
                taskName: 'file.js'
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
                taskName: 'file.js'
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
                taskName: 'file.js'
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
                taskName: 'file.js'
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
                taskName: 'file.js'
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
                taskName: "file.js"
            }
        );
    });
});
