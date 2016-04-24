const assert = require('chai').assert;
const cli = require("../");
const types = require("../dist/task.sequence.factories").SequenceItemTypes;
const logerrors = require("../dist/reporters/defaultReporter").logErrors;

function handoff(cmd, input, cb) {
    return cli({
        input: ['run'].concat(cmd),
        flags: {
            handoff: true
        }
    }, input, cb);
}

function log (obj, pathname) {
    console.log(obj);
    require('fs').writeFileSync(pathname || 'out.json', JSON.stringify(obj, null, 4));
}

describe('Gathering run tasks, grouped by runMode', function () {
    it('can gather groups in series', function () {
        this.timeout(10000);
        var runner = handoff(['js'], {
            tasks: {
                'build-all': ['js', 'css'],
                'js':        ['test/fixtures/tasks/simple.multi.js:*'],
                'css':       'test/fixtures/tasks/simple.js:first:second'
            },
            config: {
                'test/fixtures/tasks/simple.multi.js': {
                    first: {name: 'shane'},
                    second: {name: 'kittie'}
                }
            }
        });

        assert.equal(runner.sequence[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items.length, 4);
        assert.equal(runner.sequence[0].items[0].config.name, 'shane');
        assert.equal(runner.sequence[0].items[1].config.name, 'shane');
        assert.equal(runner.sequence[0].items[2].config.name, 'kittie');
        assert.equal(runner.sequence[0].items[3].config.name, 'kittie');
    });
    it('can gather groups in parallel', function () {
        this.timeout(10000);
        var runner = handoff(['build-all@p'], {
            tasks: {
                'build-all': ['js', 'css'],
                'js':        ['test/fixtures/tasks/simple.multi.js:*'],
                'css':       'test/fixtures/tasks/simple.js:first:second'
            },
            config: {
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
        assert.equal(runner.sequence[0].items[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[0].items.length, 4);
        assert.equal(runner.sequence[0].items[1].items.length, 2);
    });
    it.only('can gather groups in parallel when @p in task name', function () {
        this.timeout(10000);
        var runner = handoff(['build-all'], {
            tasks: {
                'build-all@p': ['js', 'css'],
                'js':        ['test/fixtures/tasks/simple.multi.js:*'],
                'css':       'test/fixtures/tasks/simple.js:first:second'
            },
            config: {
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
        assert.equal(runner.sequence[0].items[0].type, types.SeriesGroup);
        assert.equal(runner.sequence[0].items[0].items.length, 4);
        assert.equal(runner.sequence[0].items[1].items.length, 2);
    });
    it('can run in series', function (done) {
        this.timeout(10000);
        var runner = handoff(['js', 'css'], {
            tasks: {
                'build-all': ['js', 'css'],
                'js':        ['test/fixtures/tasks/simple.multi.js:*'],
                'css':       'test/fixtures/tasks/simple.js:first:second'
            },
            config: {
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
        var runner = handoff(['js@p', 'css@p'], {
            tasks: {
                'build-all': ['js', 'css'],
                'js':        ['test/fixtures/tasks/simple.multi.js:*'],
                'css':       'test/fixtures/tasks/simple.js:first:second'
            },
            config: {
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
});

