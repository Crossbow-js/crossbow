const assert = require('chai').assert;
const utils = require("../../utils");
const fs = require("fs");
const path = require("path");

describe("skipping tasks", function () {
    it("resolves tasks with children + if props", function () {

        const runner = utils.getRunner(['js', 'svg'], {
            tasks: {
                js: {
                    ifChanged: ['test/fixtures/js'],
                    tasks: [
                        'css',
                        'test/fixtures/tasks/simple.js'
                    ]
                },
                css: {
                    ifChanged: ['test'],
                    tasks: ['@npm sleep 0.1', 'img']
                },
                img: {
                    ifChanged: ['examples'],
                    tasks: ['@npm sleep 0.1']
                },
                svg: '@sh printenv'
            }
        });

        assert.equal(runner.tasks.all[0].ifChanged[0], 'test/fixtures/js', 'JS Task added level task not added');
        assert.equal(runner.tasks.all[0].tasks[0].ifChanged[0], 'test/fixtures/js');
        assert.equal(runner.tasks.all[0].tasks[0].ifChanged[1], 'test');
        assert.equal(runner.tasks.all[0].tasks[0].tasks[0].ifChanged.length, 2, 'same as parent');
        assert.equal(runner.tasks.all[0].tasks[0].tasks[1].ifChanged.length, 3, '1 extra from parent');

        assert.equal(runner.tasks.all[0].tasks[0].tasks[1].ifChanged[0], 'test/fixtures/js');
        assert.equal(runner.tasks.all[0].tasks[0].tasks[1].ifChanged[1], 'test');
        assert.equal(runner.tasks.all[0].tasks[0].tasks[1].ifChanged[2], 'examples');
    });
    it("writes a .crossbow/manifest.json file on first run (nothing to compare)", function (done) {
        require('rimraf').sync('.crossbow');
        utils.executeRun(['js', 'svg'], {
            tasks: {
                js: {
                    ifChanged: ['test/fixtures/js'],
                    tasks: [
                        'css',
                        'test/fixtures/tasks/simple.js'
                    ]
                },
                css: {
                    ifChanged: ['test'],
                    tasks: ['@npm sleep 0.1', 'img']
                },
                img: {
                    ifChanged: ['examples'],
                    tasks: ['@npm sleep 0.2']
                },
                svg: '@sh sleep 0.02'
            }
        }).toArray().subscribe(function () {
            const history = require(path.join(process.cwd(), '.crossbow/history.json'));
            assert.equal(history.hashes.length, 3);
            assert.equal(history.hashes[0].changed, true);
            assert.equal(history.hashes[1].changed, true);
            assert.equal(history.hashes[2].changed, true);
            done();
        });
    });
    it("skips tasks when history file exists and nothing changed", function (done) {

        require('rimraf').sync('.crossbow');

        const input = {
            tasks: {
                js: {
                    ifChanged: ['test/fixtures/js'],
                    tasks: [
                        'css',
                        'test/fixtures/tasks/simple.js'
                    ]
                },
                css: {
                    ifChanged: ['test'],
                    tasks: ['@npm sleep 0.1']
                },
                svg: '@sh sleep 0.02'
            }
        };

        // First run
        utils.executeRun(['js', 'svg'], input)
            .toArray()
            .map(xs => xs[xs.length-1].data)
            .subscribe(function (output) {

                // console.log(output.reports);
                const ends = output.reports.filter(x => x.type === 'end').map(x => x.stats);
                assert.equal(ends[0].skipped, false, 'none skipped on first run');
                assert.equal(ends[1].skipped, false, 'none skipped on first run');
                assert.equal(ends[2].skipped, false, 'none skipped on first run');

                // Second run
                utils.executeRun(['js', 'svg'], input)
                    .toArray()
                    .map(xs => xs[xs.length-1].data)
                    .subscribe(function (output) {

                        const ends = output.reports.filter(x => x.type === 'end').map(x => x.stats);
                        assert.equal(ends[0].skipped, true,  'first task skipped on second run');
                        assert.equal(ends[1].skipped, true,  'second task skipped on second run');
                        assert.equal(ends[2].skipped, false, '3rd task didn\'t have "if"');

                        done();
                    });

            });
    });
    it("Still runs when no changes, but --force flag given", function (done) {

        require('rimraf').sync('.crossbow');

        const input = {
            tasks: {
                js: {
                    ifChanged: 'test/fixtures/js',
                    tasks: [
                        'css',
                        'test/fixtures/tasks/simple.js'
                    ]
                },
                css: {
                    ifChanged: ['test'],
                    tasks: ['@npm sleep 0.1']
                },
                svg: '@sh sleep 0.01'
            }
        };

        // First run
        utils.executeRun(['js', 'svg'], input, {force: true})
            .toArray()
            .map(xs => xs[xs.length-1].data)
            .subscribe(function (output) {

                const ends = output.reports.filter(x => x.type === 'end').map(x => x.stats);
                assert.equal(ends[0].skipped, false, 'none skipped on first run');
                assert.equal(ends[1].skipped, false, 'none skipped on first run');
                assert.equal(ends[2].skipped, false, 'none skipped on first run');

                // Second run
                utils.executeRun(['js', 'svg'], input, {force: true})
                    .toArray()
                    .map(xs => xs[xs.length-1].data)
                    .subscribe(function (output) {

                        const ends = output.reports.filter(x => x.type === 'end').map(x => x.stats);
                        assert.equal(ends[0].skipped, false,  'STILL not skipped on second run');
                        assert.equal(ends[1].skipped, false,  'STILL not skipped on second run');
                        assert.equal(ends[2].skipped, false, '3rd task didn\'t have "ifChanged anyway"');

                        done();
                    });

            });
    });
});
