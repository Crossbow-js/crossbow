const assert = require('chai').assert;
const cli = require("../../");
const types = require("../../dist/task.sequence.factories").SequenceItemTypes;
const TaskReportType = require('../../dist/task.runner').TaskReportType;
const TaskRunModes = require('../../dist/task.resolve').TaskRunModes;

describe('Gathering run tasks, grouped by runMode', function () {
    it('can gather groups in series', function () {
        this.timeout(10000);
        var runner = cli.getRunner(['js'], {
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
        this.timeout(10000);

        var runner = cli.getRunner(['build-all@p'], {
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
        this.timeout(10000);
        var runner = cli.getRunner(['build-all'], {
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
        this.timeout(10000);
        var runner = cli.getRunner(['build-all'], {
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
        assert.equal(runner.sequence[0].items[1].items[2].type, types.Task);
    });
    it('produces reports in the correct order', function (done) {
        this.timeout(10000);
        var runner = cli.getRunner(['build-all'], {
            tasks: {
                'build-all': ['clean', ['js', 'css', 'svg']],
                'clean':     'test/fixtures/tasks/simple.js',
                'js':        'test/fixtures/tasks/simple.js',
                'css':       'test/fixtures/tasks/simple.js',
                'svg':       () => {}
            }
        });

        runner.runner
            .series()
            .toArray()
            .subscribe(function (reports) {

                assert.equal(reports[0].type, 'start');
                assert.equal(reports[1].type, 'end');

                assert.equal(reports[2].type, 'start');
                assert.equal(reports[3].type, 'start');
                assert.equal(reports[4].type, 'start');

                assert.equal(reports[5].type, 'end');
                assert.equal(reports[6].type, 'end');
                assert.equal(reports[7].type, 'end');

                done();
            })
    });
    it('can gather groups in parallel in a nested array (cbfile)', function () {
        this.timeout(10000);
        var runner = cli.getRunner(['multi'], {}, {cbfile: 'test/fixtures/cbfile.js'});

        assert.equal(runner.tasks.all[0].tasks[0].runMode, TaskRunModes.series);
        assert.equal(runner.tasks.all[0].tasks[1].runMode, TaskRunModes.parallel);

        assert.equal(runner.sequence[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[1].type, types.ParallelGroup);

        assert.equal(runner.sequence[0].items[1].items.length, 2);
    });
    it('can gather groups in parallel when @p call site', function () {
        this.timeout(10000);
        var runner = cli.getRunner(['build-all'], {
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
    it('can run in series', function (done) {
        this.timeout(10000);
        var runner = cli.getRunner(['js', 'css'], {
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

        const stream$  = runner.runner.series().share();
        const messages = [];
        const now      = new Date().getTime();

        stream$.subscribe(x => {
            messages.push(x);
        }, e => {
            done(e);
        }, _ => {
            assert.equal(messages.length, 12);
            assert.ok(new Date().getTime() - now > 60, '6 tasks at 10ms each should take longer than 60ms');
            done();
        });
    });
    it('can run in parallel', function (done) {
        this.timeout(10000);
        var runner = cli.getRunner(['js@p', 'css@p'], {
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

        const stream$  = runner.runner.parallel().share();
        const messages = [];
        stream$.subscribeOnNext(function (val) {
            messages.push(val);
        });
        stream$.subscribeOnCompleted(function () {
            assert.equal(messages.length, 12);
            done();
        });
    });
    it('runs a single external task (with multi functions) in seq', function (done) {
        this.timeout(10000);
        var runner = cli.run(['test/fixtures/tasks/simple.multi.js']);
        runner.subscribe(function (x) {
            assert.equal(x.reports[0].type, TaskReportType.start);
            assert.equal(x.reports[2].type, TaskReportType.start);
        }, function (err) {
            done(err);
        }, function () {
            done();
        });
    });
});

