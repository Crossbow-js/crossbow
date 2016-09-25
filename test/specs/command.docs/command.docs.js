const assert = require('chai').assert;
const reports = require('../../../dist/reporter.resolve');
const utils = require('../../utils');

describe('command.docs', function () {
    it("reports tasks with @p", function () {
        const runner = utils.run({
            input: ['docs']
        }, {
            tasks: {
                'build@p': ['css', 'js'],
                css: function cssTask() {},
                js: function jsTask() {}
            }
        });

        runner
            .output
            .pluck('data')
            .subscribe(function (data) {
                console.log(data);
                // assert.include(data[1], 'build <p>'); // 1s + 2 parallel at 100ms each === 1.10s
            });
    });
});

