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
                'css':       ['@npm css1', '@npm css2', '@npm css3', 'html'],
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

        const obs = Rx.Observable.concat(getObs(res, [])).share();

        var count = 0;
        var time = 0;

        console.time('rx');
        var now = new Date().getTime();

        obs.subscribeOnNext(function (value) {
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

        function createObservableForTask(item) {
            return Rx.Observable.create(observer => {
                setTimeout(function () {
                    observer.onNext(item.task.taskName);
                    observer.onCompleted();
                }, 50);
            }).timestamp()
                .map(x => {
                    x.timestamp = x.timestamp - now;
                    return x;
                })
        }

        function log (obj) {
            console.log(obj);
            require('fs').writeFileSync('out.json', JSON.stringify(obj, null, 4));
        }
    });
});
