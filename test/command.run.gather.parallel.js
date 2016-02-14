const assert = require('chai').assert;
const cli = require("../");
const Rx = require("rx");
const createSeq = require("../dist/task.sequence").createSequence;
const createSeq2 = require("../dist/task.sequence").createFlattenedSequence;
const createRunner = require("../dist/task.sequence").createRunner;

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
    it.only('can run in series', function (done) {
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

        log(runner.sequence);
        //const seq = createSeq2(runner.tasks.valid);
        //log(runner.sequence);
        //const run = createRunner(seq);
        //log(seq);
        //console.log(runner.tasks.valid);
        //console.log(runner.runner);

        var o = [
            {
                type: 'Series Group',
                parents: [],
                name: 'js',
                items: [
                    {
                        type: 'Task',
                        parents: ['js'],
                        factory: function simple(){},
                        task: {
                            "modules": [
                                "/Users/shakyshane/crossbow/crossbow-cli/test/fixtures/tasks/simple.multi.js"
                            ],
                            "parents": [
                                "js"
                            ],
                            "valid": true,
                            "rawInput": "test/fixtures/tasks/simple.multi.js",
                            "subTasks": [],
                            "tasks": [],
                            "errors": [],
                            "runMode": "series",
                            "completed": false,
                            "taskName": "test/fixtures/tasks/simple.multi.js"
                        }
                    },
                    {
                        type: 'Task',
                        parents: ['js'],
                        id: '0.1',
                        factory: function simple2(){},
                        task: {
                            "modules": [
                                "/Users/shakyshane/crossbow/crossbow-cli/test/fixtures/tasks/simple.multi.js"
                            ],
                            "parents": [
                                "js"
                            ],
                            "valid": true,
                            "rawInput": "test/fixtures/tasks/simple.multi.js",
                            "subTasks": [],
                            "tasks": [],
                            "errors": [],
                            "runMode": "series",
                            "completed": false,
                            "taskName": "test/fixtures/tasks/simple.multi.js"
                        }
                    }
                ]
            }
        ]

        done();

        //log(runner.tasks.valid);
        //console.log(runner.sequence);


        //var stream$ = Rx.Observable.merge(runner.sequence)
        //    .subscribe(function (val) {
        //        console.log(val);
        //    }, function (e) {
        //
        //    }, function () {
        //        //log(runner.tasks.valid, 'out2.json');
        //        console.log(runner.tasks.valid[0]);
        //        done();
        //    })

        //stream$.subscribeOnNext(function (val) {
        //	//console.log(val);
        //});
        //
        //stream$.subscribeOnCompleted(function (val) {
        //    console.log(runner.sequence[0]._sources);
        //    done();
        //});

    })
    it.skip('can gather tasks when parallel syntax used', function (done) {
        this.timeout(10000);
        var runner = handoff(['build-all@p'], {
            tasks: {
                'build-all': ['js', 'css'],
                'css':       ['@npm css1', '@npm css2', '@npm css3', 'html'],
                'js':        ['@npm webpack', '@npm uglify src/*.js'],
                'html':      ['@npm html1', '@npm curl html2']
            }
        });

        function getObs (items, initial) {
            return items.reduce(function (acc, item) {
                if (item.tasks.length) {
                    if (item.runMode === 'parallel') {
                        return acc.concat(Rx.Observable.merge(getObs(item.tasks, [])));
                    } else {
                        return acc.concat(Rx.Observable.concat(getObs(item.tasks, [])));
                    }
                }
                return acc.concat(createObservableForTask(item));
            }, initial);
        }

        //console.log(getObs(runner.tasks.valid, []));

        const obs = Rx.Observable.concat(getObs(runner.tasks.valid, [])).share();

        var count = 0;
        var time = 0;

        console.time('rx');
        var now = new Date().getTime();

        obs.subscribeOnNext(function (value) {
            console.log(value);
            time += value.timestamp;
            count += 1;
        });

        obs.subscribeOnCompleted(function () {
            console.timeEnd('rx');
            assert.equal(count, 7);
            const timeTaken = new Date().getTime() - now;
            assert.ok(timeTaken > 250 && timeTaken < 300, 'should be within this time window: 250ms & 300ms');
            done();
        });

        function createObservableForTask(task) {
            return Rx.Observable.create(observer => {
                setTimeout(function () {
                    observer.onNext(task.taskName);
                    observer.onCompleted();
                }, 50);
            }).timestamp()
                .map(x => {
                    x.timestamp = x.timestamp - now;
                    return x;
                })
        }
    });
});
