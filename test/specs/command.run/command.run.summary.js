const assert = require('chai').assert;
const utils = require("../../utils");
const TaskReportType = require('../../../dist/task.runner').TaskReportType;

describe('Running tasks and giving summary', function () {
    it('with single task', function () {
        const runner = utils.run({
            input: ['run', 'js'],
            flags: {}
        }, {
            tasks: {
                js: {
                    tasks: utils.task(100)
                }
            }
        });
        runner.output.filter(x => x.origin === 'Summary').pluck('data').map(x => x.join('\n')).subscribe(x => {
            assert.include(x, `{ok: } {bold:Summary:}`);
            assert.include(x, `Total Time: {yellow:0.10s}`);
            assert.include(x, `Tasks:      {cyan:1}`);
            assert.include(x, `Completed:  {green:1}`);
        });
    });
    it('with multiple tasks', function () {
        const runner = utils.run({
            input: ['run', 'js', 'css'],
            flags: {}
        }, {
            tasks: {
                js: {
                    tasks: utils.task(100)
                },
                css: utils.task(2000)
            }
        });
        runner.output.filter(x => x.origin === 'Summary').pluck('data').map(x => x.join('\n')).subscribe(x => {
            assert.include(x, `{ok: } {bold:Summary:}`);
            assert.include(x, `Total Time: {yellow:2.10s}`);
            assert.include(x, `Tasks:      {cyan:2}`);
            assert.include(x, `Completed:  {green:2}`);
        });
    });
    it('with error tasks', function () {
        const runner = utils.run({
            input: ['run', 'error', 'css'],
            flags: {}
        }, {
            tasks: {
                error: {
                    tasks: utils.error(100)
                },
                css: utils.task(2000)
            }
        });
        runner.output.filter(x => x.origin === 'Summary').pluck('data').map(x => x.join('\n')).subscribe(x => {
            assert.include(x, `{red:x} {bold:Summary:}`);
            assert.include(x, `Total Time: {yellow:0.10s}`);
            assert.include(x, `Tasks:      {cyan:2}`);
            assert.include(x, `Completed:  {green:0}`);
            assert.include(x, `Failed:     {red:1}`);
        });
    });
    it('with error tasks in parallel', function () {
        const runner = utils.run({
            input: ['run', 'error', 'css'],
            flags: {
                parallel: true
            }
        }, {
            tasks: {
                error: {
                    tasks: utils.error(100)
                },
                css: utils.task(2000)
            }
        });
        runner.output.filter(x => x.origin === 'Summary').pluck('data').map(x => x.join('\n')).subscribe(x => {
            assert.include(x, `{red:x} {bold:Summary:}`);
            assert.include(x, `Total Time: {yellow:2.00s}`);
            assert.include(x, `Tasks:      {cyan:2}`);
            assert.include(x, `Completed:  {green:1}`);
            assert.include(x, `Failed:     {red:1}`);
        });
    });
    it('with skipped tasks', function () {
        const runner = utils.run({
            input: ['run', 'js'],
            flags: {
                parallel: true,
                skip: ['css']
            }
        }, {
            tasks: {
                js: {
                    tasks: [utils.task(100), utils.task(3000), 'css']
                },
                css: utils.task(2000)
            }
        });
        runner.output.filter(x => x.origin === 'Summary').pluck('data').map(x => x.join('\n')).subscribe(x => {
            assert.include(x, `    Total Time: {yellow:3.10s}`);
            assert.include(x, `    Tasks:      {cyan:3}`);
            assert.include(x, `    Skipped:    {cyan:1}`);
            assert.include(x, `    Completed:  {green:2}`);
        });
    });
});
