const assert = require('chai').assert;
const cli = require("../");
const fs = require("fs");
const Rx = require("rx");
const path = require("path");
const exec = require('child_process').exec;

describe("skipping tasks", function () {
    it("resolves tasks with children + if props", function () {

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
    it("writes a .crossbow/manifest.json file on first run (nothing to compare)", function (done) {
        require('rimraf').sync('.crossbow');
        cli.run(['js', 'svg'], {
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
                    tasks: ['@npm sleep 0.2']
                },
                svg: '@sh sleep 0.02'
            }
        }).subscribe(function (output) {
            const history = require(path.join(process.cwd(), '.crossbow/history.json'));
            assert.equal(history.hashes.length, 3);
            assert.equal(history.hashes[0].changed, true);
            assert.equal(history.hashes[1].changed, true);
            assert.equal(history.hashes[2].changed, true);
            done();
        });
    });
    it.only("skips tasks when history file exists and nothing changed", function (done) {

        require('rimraf').sync('.crossbow');

        const input = {
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
                    tasks: ['@npm sleep 0.1']
                },
                svg: '@sh sleep 0.02'
            }
        };

        // First run
        cli.run(['js', 'svg'], input)
            .subscribe(function (output) {

                const ends = output.reports.filter(x => x.type === 'end').map(x => x.stats);
                assert.equal(ends[0].skipped, false, 'none skipped on first run');
                assert.equal(ends[1].skipped, false, 'none skipped on first run');
                assert.equal(ends[2].skipped, false, 'none skipped on first run');

                // Second run
                cli.run(['js', 'svg'], input)
                    .subscribe(function (output) {

                        const ends = output.reports.filter(x => x.type === 'end').map(x => x.stats);
                        assert.equal(ends[0].skipped, true,  'first task skipped on second run');
                        assert.equal(ends[1].skipped, true,  'second task skipped on second run');
                        assert.equal(ends[2].skipped, false, '3rd task didn\'t have "if"');

                        done();
                    });

            });
    });
});
