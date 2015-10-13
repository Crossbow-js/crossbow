var assert   = require('chai').assert;
var watch    = require('../lib/command.watch');
var cwd      = require('path').resolve('test/fixtures');
var current  = process.cwd();
var resolve  = require('path').resolve;
var tasklist = require('../lib/utils').getPresentableTaskList;

describe('Creating presentable task list', function () {
    it('can normalise tasks', function () {
        var tasks = tasklist([
            'bs:reload',
            'babel',
            'copy:images',
            'some/long/filepath as eslint'
        ]);

        assert.equal(tasks[0], 'bs:reload');
        assert.equal(tasks[1], 'babel');
        assert.equal(tasks[2], 'copy:images');
        assert.equal(tasks[3], 'eslint');
    });
});