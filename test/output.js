const assert = require('chai').assert;
const cli = require("../");
const configMerge = require("../dist/config").merge;
const getTaskTree = require("../dist/task.utils").getTaskTree;
const getInputs = require("../dist/input.resolve").getInputs;

describe('Preparing data for output', function () {
    it('getTaskTree() limit 1', function () {
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: ['css'],
                css: ['html'],
                html: ['@html min']
            }
        });

        const tree = getTaskTree(runner.tasks.all, 1);
        assert.equal(tree[0].tasks.length, 0);
    });
    it('getTaskTree() limit 2', function () {
        const runner = cli.getRunner(['js'], {
            tasks: {
                js: ['css'],
                css: ['html'],
                html: ['@html min']
            }
        });

        const tree = getTaskTree(runner.tasks.all, 2);
        assert.equal(tree.length, 1);
        assert.equal(tree[0].tasks.length, 1);
        assert.equal(tree[0].tasks[0].tasks.length, 0);
    });
});
