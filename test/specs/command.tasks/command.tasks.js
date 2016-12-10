const assert = require('chai').assert;
const reports = require('../../../dist/reporter.resolve');
const utils = require('../../utils');

describe.only('command.tasks', function () {
    it("reports tasks with @p", function () {
        const runner = utils.run({
            input: ['tasks']
        }, {
            tasks: {
                'build@p': ['css', 'js'],
                css: function cssTask() {},
                js: function jsTask() {}
            }
        });

        runner
            .output
            .filter(x => x.origin === 'SimpleTaskList')
            .pluck('data')
            .subscribe(function (data) {
                assert.include(data[1], 'build <p>'); // 1s + 2 parallel at 100ms each === 1.10s
            });
    });
    it("reports tasks with Parent", function () {
        const runner = utils.run({
            input: ['tasks']
        }, {
            tasks: {
                docker: [
                    '@npm sleep 1'
                ],
                '(sh)': {
                    'build': ['@npm auto prefxier', '@sh s3 deploy assets'],
                    css: function cssTask() {},
                    js: function jsTask() {},
                    other: {
                        description: 'My description bro',
                        tasks: ['@npm sleep 1']
                    }
                }
            }
        });

        runner
            .output
            .filter(x => x.origin === 'SimpleTaskList')
            .pluck('data')
            .take(2)
            .subscribe(function (data) {
                console.log(data);
                // assert.deepEqual(data, [ '{yellow:Available Tasks:',
                //     'docker     [ @npm sleep 1 ]',
                //     'sh:build   [ @npm auto prefxier, @sh s3 deploy assets ]',
                //     'sh:css     [ _inline_fn_0_cssTask ]',
                //     'sh:js      [ _inline_fn_1_jsTask ]',
                //     'sh:other   [ @npm sleep 1 ]' ]);
                // assert.include(data[1], 'build <p>'); // 1s + 2 parallel at 100ms each === 1.10s
            });
    });
});

