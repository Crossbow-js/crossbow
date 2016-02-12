const assert = require('chai').assert;
const cli = require("../");
const Rx = require("rx");
const createSeq = require("../dist/task.sequence").createSequence;

function handoff(cmd, input, cb) {
    return cli({
        input: ['run'].concat(cmd),
        flags: {
            handoff: true
        }
    }, input, cb);
}

describe('Gathering run tasks, grouped by runMode', function () {
    it.only('can gather tasks when parallel syntax used', function (done) {
        this.timeout(10000);
        var runner = handoff(['build-all'], {
            tasks: {
                'build-all': ['js', 'css'],
                'css':       ['@npm sass', '@npm postcss', '@shell ls', 'html'],
                'js':        ['@npm webpack', '@npm uglify src/*.js'],
                'html':      ['@npm HTMLmin', '@npm curl something']
            }
        });



        function pullMany (items, parents) {
            return items.reduce(function (all, task) {
                if (task.runMode === 'parallel' && task.tasks.length) {

                    return all.concat({
                        type: 'Parallel Group',
                        parents: parents,
                        items: task.tasks.map(_task => {
                            if (_task.adaptor) {
                                return {
                                    type: 'Item',
                                    parents: parents.concat(task.taskName),
                                    task: _task
                                };
                            }
                            if (_task.tasks) {
                                return {
                                    parents: parents,
                                    tasks: pullMany(_task.tasks, parents.concat(task.taskName))
                                };
                            }
                        })
                    });
                }

                if (task.tasks.length) {
                    return all.concat({
                        type: 'Series Group',
                        parents: parents,
                        items: pullMany(task.tasks, parents.concat(task.taskName))
                    });
                }

                return all.concat({
                    type: 'Item',
                    parents: parents,
                    task: task
                });
            }, []);
        }

        console.time('rx');

        const res = pullMany(runner.tasks.valid, []);

        function getObs (items, initial) {
            return items.reduce(function (acc, item) {

                if (item.type === 'Series Group') {
                    return acc.concat(Rx.Observable.concat(getObs(item.items, acc)));
                }

                if (item.type === 'Parallel Group') {

                    return acc.concat(Rx.Observable.merge(getObs(item.items, acc)));
                }

                return acc.concat(createObservableForTask(item));

            }, initial);
        }

        //log(res);
        //done();
        //console.log(getObs(res, [])[0]);

        done();
        //const obs = Rx.Observable.concat(getObs(res, [])).share();
        //
        //obs.subscribeOnNext(function (value) {
        //    console.log(value);
        //});
        //
        //obs.subscribeOnCompleted(function () {
        //    console.timeEnd('rx');
        //    done();
        //});
        ////
        //
        var now = new Date().getTime();
        //
        function createObservableForTask(item) {
            return Rx.Observable.create(observer => {
                setTimeout(function () {
                    observer.onNext(item.task.taskName);
                    observer.onCompleted();
                }, 100);
            }).timestamp()
                .map(x => {
                    x.timestamp = x.timestamp - now;
                    return x;
                })
        }
        //
        //var s$ = Rx.Observable.merge(
        //    createObservableForTask('1'),
        //    createObservableForTask('2')
        //);
        //
        //var s2$ = Rx.Observable.merge(
        //    createObservableForTask('3'),
        //    createObservableForTask('4')
        //);
        //
        //const result$ = Rx.Observable.merge(s$, s2$);
        //
        //result$.subscribeOnCompleted(function () {
        //    console.timeEnd('rx');
        //    console.log('All done');
        //    done();
        //});

        function log (obj) {
            console.log(obj);
            require('fs').writeFileSync('out.json', JSON.stringify(obj, null, 4));
        }

        //console.log(runner.sequence[0]);
        //console.log(runner.sequence[1]);
        //console.log(runner.sequence[1].task.taskName);
        //console.log(runner.sequence[2].task.taskName);
        //console.log(runner.sequence[3].task.taskName);
        //console.log(runner.sequence[4].task.taskName);

        //assert.equal(runner.sequence[0].sequenceTasks.length, 1);
        //assert.equal(runner.tasks.valid[0].taskName, '@npm ls');
        //assert.equal(runner.tasks.valid[0].command, 'ls');

    });
});
