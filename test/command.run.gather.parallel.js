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
        var runner = handoff(['build-all@p'], {
            tasks: {
                'build-all': ['js', 'css'],
                'css':       ['@npm css1', '@npm css2', '@shell css3', 'html'],
                'js':        ['@npm webpack', '@npm uglify src/*.js'],
                'html':      ['@npm html1', '@npm curl html2']
            }
        });

        function pullMany (items, parents) {
            return items.reduce(function (all, task) {
                var type = 'Series Group';

                if (task.tasks.length) {
                    if (task.runMode === 'parallel') {
                        type = 'Parallel Group';
                    }
                    return all.concat({
                        type: type,
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
                    return acc.concat(Rx.Observable.concat(getObs(item.items, [])));
                }

                if (item.type === 'Parallel Group') {
                    return acc.concat(Rx.Observable.merge(getObs(item.items, [])));
                }

                if (item.type === 'Item') {
                    return acc.concat(createObservableForTask(item));
                }

                return acc;

            }, initial);
        }

        //done();

        //log(res);
        //done();

        //const stream$ = Rx.Observable.merge(
        //        Rx.Observable.concat(
        //            // second series
        //            createObservableForTask({task: {taskName: '1 - 1'}}),
        //            createObservableForTask({task: {taskName: '1 - 2'}})
        //        ),
        //        Rx.Observable.concat(
        //            // second series
        //            createObservableForTask({task: {taskName: '2 - 1'}}),
        //            createObservableForTask({task: {taskName: '2 - 2'}}),
        //            createObservableForTask({task: {taskName: '2 - 3'}}),
        //            Rx.Observable.concat(
        //                createObservableForTask({task: {taskName: '3 - 1'}}),
        //                createObservableForTask({task: {taskName: '3 - 2'}}),
        //                Rx.Observable.merge(
        //                    createObservableForTask({task: {taskName: '4 - 1'}}),
        //                    createObservableForTask({task: {taskName: '4 - 2'}}),
        //                    createObservableForTask({task: {taskName: '4 - 3'}}),
        //                    createObservableForTask({task: {taskName: '4 - 4'}}),
        //                    createObservableForTask({task: {taskName: '4 - 5'}}),
        //                    createObservableForTask({task: {taskName: '4 - 6'}})
        //                )
        //            )
        //        )
        //    );
        //
        //stream$.subscribe(function (val) {
        //	console.log('val', val);
        //})
        //stream$.subscribeOnCompleted(function () {
        //    console.log('done');
        //    done();
        //})

        const obs = Rx.Observable.concat(getObs(res, [])).share();

        obs.subscribeOnNext(function (value) {
            console.log(value);
        });

        obs.subscribeOnCompleted(function () {
            console.timeEnd('rx');
            done();
        });
        ////
        //
        var now = new Date().getTime();
        //
        function createObservableForTask(item) {
            console.log(item.type);
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
