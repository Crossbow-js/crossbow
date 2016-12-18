const assert = require('chai').assert;
const cli = require("../../../dist/public/index");
const utils = require("../../utils");
const t100 = require("../../utils").task(100);
const types = require("../../../dist/task.sequence.factories").SequenceItemTypes;
const TaskReportType = require('../../../dist/task.runner').TaskReportType;
const TaskRunModes = require('../../../dist/task.resolve').TaskRunModes;

describe('Gathering run tasks, grouped by runMode', function () {
    it('can gather groups in series', function () {
        var runner = utils.getSetup(['js'], {
            tasks: {
                'build-all': ['js', 'css'],
                'js':        ['test/fixtures/tasks/simple.multi.js:*'],
                'css':       'test/fixtures/tasks/simple.js:first:second'
            },
            options: {
                'test/fixtures/tasks/simple.multi.js': {
                    first: {name: 'shane'},
                    second: {name: 'kittie'}
                }
            }
        });

        assert.equal(runner.sequence[0].items[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[0].items.length, 4);
        assert.equal(runner.sequence[0].items[0].items[0].options.name, 'shane');
        assert.equal(runner.sequence[0].items[0].items[1].options.name, 'shane');
        assert.equal(runner.sequence[0].items[0].items[2].options.name, 'kittie');
        assert.equal(runner.sequence[0].items[0].items[3].options.name, 'kittie');
    });
    it('can gather groups in parallel', function () {
        var runner = utils.getSetup(['build-all@p'], {
            tasks: {
                'build-all': ['js', 'css'],
                'js':        ['test/fixtures/tasks/simple.multi.js:*'],
                'css':       'test/fixtures/tasks/simple.js:first:second'
            },
            options: {
                'test/fixtures/tasks/simple.multi.js': {
                    first: {name: 'shane'},
                    second: {name: 'kittie'}
                },
                'test/fixtures/tasks/simple.js': {
                    first: {name: 'shane'},
                    second: {name: 'kittie'}
                }
            }
        });
        assert.equal(runner.sequence[0].items.length, 2);
        assert.equal(runner.sequence[0].type, types.ParallelGroup);

        assert.equal(runner.sequence[0].items[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[1].type, types.SeriesGroup);


        // console.log(runner.sequence[0].items[0].items[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[0].items[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[0].items[0].items[0].type, types.Task);
        assert.equal(runner.sequence[0].items[0].items[0].items[1].type, types.Task);

        assert.equal(runner.sequence[0].items[0].items[0].items[0].options.name, 'shane');
        assert.equal(runner.sequence[0].items[0].items[0].items[1].options.name, 'shane');

        assert.equal(runner.sequence[0].items[0].items[0].items[2].options.name, 'kittie');
        assert.equal(runner.sequence[0].items[0].items[0].items[3].options.name, 'kittie');
    });
    it('can gather groups in parallel when @p in task name', function () {
        var runner = utils.getSetup(['build-all'], {
            tasks: {
                'build-all@p': ['js', 'css'],
                'js':        ['test/fixtures/tasks/simple.multi.js:*'],
                'css':       'test/fixtures/tasks/simple.js:first:second'
            },
            options: {
                'test/fixtures/tasks/simple.multi.js': {
                    first: {name: 'shane'},
                    second: {name: 'kittie'}
                },
                'test/fixtures/tasks/simple.js': {
                    first: {name: 'shane'},
                    second: {name: 'kittie'}
                }
            }
        });
        assert.equal(runner.sequence[0].type, types.ParallelGroup);
        assert.equal(runner.sequence[0].items.length, 2);


        assert.equal(runner.sequence[0].items[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[1].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[0].items[0].items.length, 4);
    });
    it('can gather groups in parallel in a nested array', function () {
        var runner = utils.getSetup(['build-all'], {
            tasks: {
                'build-all': ['clean', ['js', 'css', 'svg']],
                'clean': 'test/fixtures/tasks/simple.js',
                'js':    'test/fixtures/tasks/simple.js',
                'css':   'test/fixtures/tasks/simple.js',
                'svg': function () {

                }
            }
        });

        assert.equal(runner.sequence[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[1].type, types.ParallelGroup);
        assert.equal(runner.sequence[0].items[1].items.length, 3);

        assert.equal(runner.sequence[0].items[1].items[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[1].items[1].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[1].items[2].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[1].items[2].items[0].type, types.Task);
    });
    it('produces reports in the correct order', function () {
        var runner = utils.run({input: ['run', 'build-all']}, {
            tasks: {
                'build-all': ['clean', ['js', 'css', 'svg']],
                'clean':     'test/fixtures/tasks/simple.js',
                'js':        'test/fixtures/tasks/simple.js',
                'css':       'test/fixtures/tasks/simple.js',
                'svg':       () => {}
            }
        });

        const reports  = utils.getReports(runner);
        // const complete = utils.getComplete(runner);

        assert.equal(reports[0].type, 'start');
        assert.equal(reports[1].type, 'end');

        assert.equal(reports[2].type, 'start');
        assert.equal(reports[3].type, 'start');
        assert.equal(reports[4].type, 'start');

        assert.equal(reports[5].type, 'end');
        assert.equal(reports[6].type, 'end');
        assert.equal(reports[7].type, 'end');
    });
    it('can gather groups in parallel in a nested array (cbfile)', function () {
        var runner = utils.getSetup(['multi'], {}, {cbfile: 'test/fixtures/cbfile.js'});

        assert.equal(runner.tasks.all[0].tasks[0].runMode, TaskRunModes.series);
        assert.equal(runner.tasks.all[0].tasks[1].runMode, TaskRunModes.parallel);

        assert.equal(runner.sequence[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[1].type, types.ParallelGroup);

        assert.equal(runner.sequence[0].items[1].items.length, 2);
    });
    it('can gather groups in parallel when @p call site', function () {
        var runner = utils.getSetup(['build-all'], {
            tasks: {
                'build-all': ['js:*@p', 'css@p'],
                'js': {
                    tasks: ['test/fixtures/tasks/simple.js'],
                    options: {
                        first: {input: 'shane'},
                        second: {input: 'kittie'}
                    }
                },
                'css': ['test/fixtures/tasks/simple.js:first', 'test/fixtures/tasks/simple.js:second']
            },
            options: {
                'test/fixtures/tasks/simple.multi.js': {
                    first: {name: 'shane'},
                    second: {name: 'kittie'}
                },
                'test/fixtures/tasks/simple.js': {
                    first: {name: 'shane'},
                    second: {name: 'kittie'}
                }
            }
        });

        // console.log(runner.tasks.valid[0].tasks[0]);
        assert.equal(runner.sequence[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[0].type, types.ParallelGroup);
        assert.equal(runner.sequence[0].items[0].items[0].options.input, 'shane');
        assert.equal(runner.sequence[0].items[0].items[1].options.input, 'kittie');

        assert.equal(runner.sequence[0].items[1].type, types.ParallelGroup);
        assert.equal(runner.sequence[0].items[1].items[0].options.name, 'shane');
        assert.equal(runner.sequence[0].items[1].items[1].options.name, 'kittie');

    });
    it('can run in series', function () {
        var runner = utils.run({
            input: ['run', 'js', 'css']
        }, {
            tasks: {
                'build-all': ['js', 'css'],
                'js':        ['test/fixtures/tasks/simple.multi.js:*'],
                'css':       'test/fixtures/tasks/simple.js:first:second'
            },
            options: {
                'test/fixtures/tasks/simple.multi.js': {
                    first: {name: 'shane'},
                    second: {name: 'kittie'}
                },
                'test/fixtures/tasks/simple.js': {
                    first: {name: 'shane'},
                    second: {name: 'kittie'}
                }
            }
        });

        const reports  = utils.getReports(runner);
        assert.equal(reports.length, 12);
        assert.deepEqual(reports.map(x => x.type), [
            TaskReportType.start,
            TaskReportType.end,
            TaskReportType.start,
            TaskReportType.end,
            TaskReportType.start,
            TaskReportType.end,
            TaskReportType.start,
            TaskReportType.end,
            TaskReportType.start,
            TaskReportType.end,
            TaskReportType.start,
            TaskReportType.end,
        ]);
    });
    it('can run in parallel groups in sequence (4 types)', function () {
        // var runner = utils.getSetup(['js', 'css', 'img', 'img2@p'], {
        var runner = utils.run({input: ['run', 'js', 'css', 'img', 'img2@p']}, {
            tasks: {
                'js':  {
                    tasks: 'test/fixtures/tasks/simple.multi.js:*@p'
                },
                'css@p': 'test/fixtures/tasks/simple.js:first:second',
                'img': {
                    tasks: [t100, t100],
                    runMode: 'parallel'
                },
                'img2': [t100, t100, t100, t100]
            },
            options: {
                'test/fixtures/tasks/simple.multi.js': {
                    first: {name: 'shane'},
                    second: {name: 'kittie'}
                },
                'test/fixtures/tasks/simple.js': {
                    first: {name: 'shane'},
                    second: {name: 'kittie'}
                }
            }
        });

        const reports  = utils.getReports(runner);

        assert.deepEqual(reports.map(x => x.type), [
            // js
            TaskReportType.start,
            TaskReportType.start,
            TaskReportType.start,
            TaskReportType.start,
            TaskReportType.end,
            TaskReportType.end,
            TaskReportType.end,
            TaskReportType.end,

            // css
            TaskReportType.start,
            TaskReportType.start,
            TaskReportType.end,
            TaskReportType.end,

            // img
            TaskReportType.start,
            TaskReportType.start,
            TaskReportType.end,
            TaskReportType.end,

            // img2
            TaskReportType.start,
            TaskReportType.start,
            TaskReportType.start,
            TaskReportType.start,
            TaskReportType.end,
            TaskReportType.end,
            TaskReportType.end,
            TaskReportType.end
        ]);
    });
});

