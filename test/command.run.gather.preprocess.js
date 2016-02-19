const assert = require('chai').assert;
const preprocess = require('../dist/task.preprocess').default;

describe('can pre-process incoming task names', function () {

    it.only('can handle adaptor tasks', function () {
        assert.deepEqual(
            preprocess('@npm run shane'),
            {
                baseTaskName: '@npm run shane',
                subTaskItems: [],
                runMode: 'series',
                rawInput: '@npm run shane'
            }
        );
    });
});
