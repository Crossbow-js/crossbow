const assert = require('chai').assert;
const cli = require("../../");
const TaskTypes = require("../../dist/task.resolve").TaskTypes;
const exec = require("child_process").exec;

describe('task.resolve with --skip', function () {
    it('can skip child tasks when set on a parent', function () {
        const runner = cli.getRunner(['build'], {
            tasks: {
                build: ['js', 'css'],
                js: 'test/fixtures/tasks/simple.multi.js',
                css: '@npm sleep 1',
            }
        }, {
            skip: ['css']
        });

        assert.equal(runner.tasks.all[0].skipped, false, 'Top level task not skipped');
        assert.equal(runner.tasks.all[0].tasks[0].skipped, false, 'Top level -> 1 not skipped');
        assert.equal(runner.tasks.all[0].tasks[1].skipped, true, 'Top level -> 2 skipped');
        assert.equal(runner.tasks.all[0].tasks[1].tasks[0].skipped, true, 'Top level -> 2 -> 1 skipped');
    });
    it('skips tasks that are skipped', function (done) {

        const runner = cli.getRunner(['build'], {
            tasks: {
                build: ['js', 'css'],
                js: 'test/fixtures/tasks/simple.multi.js',
                css: '@npm sleep 1',
            }
        }, {
            skip: ['css']
        });

        runner.runner.series().last().subscribe(report => {
            assert.equal(report.item.task.skipped, true);
            assert.ok(report.stats.duration < 10);
            done();
        }, function () {
            console.log('er');
        });
    });
});
