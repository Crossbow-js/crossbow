const assert = require('chai').assert;
const reports = require('../../../dist/reporter.resolve');
const utils = require('../../utils');

describe('command.tasks', function () {
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
            .toArray()
            .subscribe(function (data) {
                assert.deepEqual(data[0], [ '{yellow:Available tasks:', 'docker   [ @npm sleep 1 ]' ]);
                assert.deepEqual(data[1], [ '{yellow:sh:',
                    'sh:build   [ @npm auto prefxier, @sh s3 deploy assets ]',
                    'sh:css     [ _inline_fn_0_cssTask ]',
                    'sh:js      [ _inline_fn_1_jsTask ]',
                    'sh:other   [ @npm sleep 1 ]' ]);
            });
    });
    it.only("reports tasks with Parent + selection", function () {
        const runner = utils.run({
            input: ['tasks']
        }, {
            tasks: {
                'other': function() {
                    console.log('ere');
                },
                'other2': function() {
                    console.log('ere');
                },
                '(docker)': {
                    exec: ['@npm sleep 1']
                },
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
            .subscribe(function (data) {
                console.log(data.join('\n'));
                // assert.deepEqual(data, [ '{yellow:sh:',
                //     'sh:build   [ @npm auto prefxier, @sh s3 deploy assets ]',
                //     'sh:css     [ _inline_fn_0_cssTask ]',
                //     'sh:js      [ _inline_fn_1_jsTask ]',
                //     'sh:other   [ @npm sleep 1 ]' ]);
            });
    });
});

