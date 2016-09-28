const assert = require('chai').assert;
const reports = require('../../../dist/reporter.resolve');
const utils = require('../../utils');

describe('command.watchers', function () {
    it("reports watchers", function () {
        const runner = utils.run({
            input: ['watchers']
        }, {
            watch: {
                default: {
                    patterns: ['*.json'],
                    tasks:    ['build']
                }
            },
            tasks: {
                build: utils.task(100)
            }
        });

        runner
            .output
            .subscribe(function (data) {
                // console.log(data);
                // assert.include(data[1], 'build <p>'); // 1s + 2 parallel at 100ms each === 1.10s
            });
    });
});

