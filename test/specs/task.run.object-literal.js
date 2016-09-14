const assert = require('chai').assert;
const cli = require("../../");
const TaskErrorTypes = require('../../dist/task.errors').TaskErrorTypes;

describe('Running tasks from object literals', function () {
    it('with single task', function (done) {
        var called = 0;
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: {
                    input: '@npm sleep .25'
                }
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                done();
            });
    });
    it('with single task as array', function (done) {
        var called = 0;
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: [{
                    input: '@npm sleep .25'
                }]
            }
        });
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                done();
            });
    });
    it('@sh with single task + env vars', function (done) {
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: [{
                    input: '@sh sleep $SLEEP',
                    env: {
                        SLEEP: '0.5'
                    }
                }]
            }
        });
        var start = new Date().getTime();
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.ok(new Date().getTime() - start > 500);
                done();
            });
    });
    it('@npm with single task + env vars', function (done) {
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: [{
                    input: '@sh sleep $SLEEP',
                    env: {
                        SLEEP: '0.5'
                    }
                }]
            }
        });
        var start = new Date().getTime();
        runner.runner
            .series()
            .toArray()
            .subscribe(function () {
                assert.ok(new Date().getTime() - start > 500);
                done();
            });
    });
});
