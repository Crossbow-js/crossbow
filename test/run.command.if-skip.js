const assert = require('chai').assert;
const cli = require("../");
const exec = require('child_process').exec;

describe("skipping tasks", function () {
    it.only("writes a .crossbow/manifest.json file on first run (nothing to compare)", function () {

        const runner = cli.getRunner(['js'], {
            tasks: {
                js: {
                    if: 'test/fixtures/js',
                    tasks: [
                        'css',
                        'test/fixtures/tasks/simple.js'
                    ]
                },
                css: '@npm sleep 0.1',
            }
        });

        assert.equal(runner.tasks.all[0].if, 'test/fixtures/js', 'JS Task added level task not added');
        assert.equal(runner.tasks.all[0].tasks[0].if, 'test/fixtures/js');
        // assert.equal(runner.tasks.all[0].tasks[0].if, 'test/fixtures/js', 'JS Task added level task not added');
        // assert.equal(runner.tasks.all[0].tasks[0].if,'test/fixtures/js', 'Top level -> 1 not added');
        // assert.equal(runner.tasks.all[0].tasks[1].if,'test/fixtures/js', 'Top level -> 2 added');
        // assert.equal(runner.tasks.all[0].tasks[1].tasks[0].if,'test/fixtures/js', 'Top level -> 2 -> 1 added');

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
