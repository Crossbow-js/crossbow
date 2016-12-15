var assert = require('chai').assert;
var utils = require("../../utils");
var fs = require("fs");
var TaskErrorTypes = require('../../../dist/task.errors').TaskErrorTypes;

describe('Detecting Circular references in task definitions', function () {
    it('Can defend against an infinite loop of task resolutions', function () {
        const runner = utils.getSetup(["js", "test/fixtures/tasks/stream.js"], {
            tasks: {
                js: ["dummy"],
                dummy: ["test/fixtures/tasks/simple.js", "test/fixtures/tasks/simple2.js", "js"]
            }
        });
        assert.equal(runner.tasks.invalid[0].tasks[0].tasks[0].errors.length, 0);
        assert.equal(runner.tasks.invalid[0].tasks[0].tasks[1].errors.length, 0);
        assert.equal(runner.tasks.invalid[0].tasks[0].tasks[2].errors[0].type, TaskErrorTypes.CircularReference);
    });
    it('Can defend against an infinite loop of task resolutions with parents', function () {
        // const runner = utils.getSetup(["dummy:js", 'inline', 'dummy:*'], {
        const runner = utils.getSetup(['dummy:kittie', 'rsync'], {
            tasks: {
                '(dummy)': {
                    css:    {
                        description: 'sdd',
                        runMode: 'parallel',
                        tasks: ['@sh node-sass', 'rsync', function(){}]
                    },
                    kittie: ['dummy:kittie']
                },
                rsync: ['@sh shane', 'rsync'],
                scp: function() {},
                inline: {
                    tasks: [function fn1(){}, function fn2(){}, 'rsync']
                }
            }
        });

        fs.writeFileSync('_tasks.json', JSON.stringify(runner.tasks.all, null, 2));
        // console.log(runner.tasks.invalid);
        // assert.equal(runner.tasks.invalid[0].tasks[0].tasks[0].errors.length, 0);
        // assert.equal(runner.tasks.invalid[0].tasks[0].tasks[1].errors.length, 0);
        // assert.equal(runner.tasks.invalid[0].tasks[0].tasks[2].errors[0].type, TaskErrorTypes.CircularReference);
    });
});
