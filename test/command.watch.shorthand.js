var assert  = require('chai').assert;
var resolve = require('../dist/watch.resolve').resolveWatchTasks;
var unwrapShorthand = require('../dist/command.watch').unwrapShorthand;

describe('Resolving shorthand watch tasks', function () {
    it('can handle single pattern + single task', function () {
        const gatheredTasks = unwrapShorthand('*.js -> @npm tsc src/**/*.ts');
        assert.equal(gatheredTasks.patterns.length, 1);
        assert.equal(gatheredTasks.patterns[0], '*.js');
        assert.equal(gatheredTasks.tasks.length, 1);
        assert.equal(gatheredTasks.tasks[0], '@npm tsc src/**/*.ts');
    });
    it('can handle multiple patterns + single task', function () {
        const gatheredTasks = unwrapShorthand('*.js:src/ -> @npm tsc src/**/*.ts');
        assert.equal(gatheredTasks.patterns.length, 2);
        assert.equal(gatheredTasks.patterns[0], '*.js');
        assert.equal(gatheredTasks.patterns[1], 'src/');
        assert.equal(gatheredTasks.tasks.length, 1);
        assert.equal(gatheredTasks.tasks[0], '@npm tsc src/**/*.ts');
    });
    it('can handle multiple patterns + random ws', function () {
        const gatheredTasks = unwrapShorthand('*.js:src/   ->  @npm tsc src/**/*.ts');
        assert.equal(gatheredTasks.patterns.length, 2);
        assert.equal(gatheredTasks.patterns[0], '*.js');
        assert.equal(gatheredTasks.patterns[1], 'src/');
        assert.equal(gatheredTasks.tasks.length, 1);
        assert.equal(gatheredTasks.tasks[0], '@npm tsc src/**/*.ts');
    });
    it('can handle multiple patterns + multiple tasks', function () {
        const gatheredTasks = unwrapShorthand('*.js:src/   ->  (unit) (lint)');
        assert.equal(gatheredTasks.patterns.length, 2);
        assert.equal(gatheredTasks.patterns[0], '*.js');
        assert.equal(gatheredTasks.patterns[1], 'src/');
        assert.equal(gatheredTasks.tasks.length, 2);
        assert.equal(gatheredTasks.tasks[0], 'unit');
        assert.equal(gatheredTasks.tasks[1], 'lint');
    });
});
