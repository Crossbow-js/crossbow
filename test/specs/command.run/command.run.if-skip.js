const assert = require('chai').assert;
const utils = require("../../utils");
const fs = require("fs");
const Rx = require("rx");
const path = require("path");

describe("skipping tasks", function () {
    it("resolves tasks with children + if props", function () {

        const runner = utils.getSetup(['js', 'svg'], {
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
});
