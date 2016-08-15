const assert = require('chai').assert;
const cli = require("../");
const exec = require('child_process').exec;

describe("skipping tasks", function () {
    it("writes a .crossbow/manifest.json file on first run (nothing to compare)", function () {

        const runner = cli.getRunner(['js', 'svg'], {
            tasks: {
                js: {
                    if: ['test/fixtures/js'],
                    tasks: [
                        'css',
                        'test/fixtures/tasks/simple.js'
                    ]
                },
                css: {
                    if: ['test'],
                    tasks: ['@npm sleep 0.1', 'img']
                },
                img: {
                    if: ['examples'],
                    tasks: ['@npm sleep 0.1']
                },
                svg: '@sh printenv'
            }
        });

        assert.equal(runner.tasks.all[0].if[0], 'test/fixtures/js', 'JS Task added level task not added');
        assert.equal(runner.tasks.all[0].tasks[0].if[0], 'test/fixtures/js');
        assert.equal(runner.tasks.all[0].tasks[0].if[1], 'test');
        assert.equal(runner.tasks.all[0].tasks[0].tasks[0].if.length, 2, 'same as parent');
        assert.equal(runner.tasks.all[0].tasks[0].tasks[1].if.length, 3, '1 extra from parent');

        assert.equal(runner.tasks.all[0].tasks[0].tasks[1].if[0], 'test/fixtures/js');
        assert.equal(runner.tasks.all[0].tasks[0].tasks[1].if[1], 'test');
        assert.equal(runner.tasks.all[0].tasks[0].tasks[1].if[2], 'examples');

        // runner.runner.series().toArray().subscribe(reports => {
        //     // assert.equal(report.item.task.skipped, true);
        //     // assert.ok(report.stats.duration < 10);
        //     console.log(reports);
        //     done();
        // }, function (err) {
        //     done(err);
        // });
    });
});
