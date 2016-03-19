//'use strict';
//
var Rx = require('rx');
var O = Rx.Observable;
var empty = O.empty;
var concat = O.concat;
var merge = O.merge;
var cp = require('child_process').spawn;

/**
 * A top-level parallel stream will not exit if any siblings fail.
 * eg:
 *      1 fails, 2, 3... still run
 *
 * Note: Nested series groups will still fail
 * eg:
 *      task 5 is followed by 6 & 7 in series
 *      task 5 fails -> 6 & 7 do not run, but siblings to
 *      5 will still continue
 * @type {*[]}
 */
var parallelStream = [
    task('-1', `sleep 1`).catch(e => O.empty()),
    task('-2', 'sleep 1').catch(e => O.empty()),
    O.merge(
        task('---3', 'sleep 1').catch(e => O.empty()),
        task('---4', 'sleep 1').catch(e => O.empty()), // ERROR
        O.concat(task('---5', 'sleep 1'), task('------6', 'sleep 1'), task('---------7', 'sleep 1')).catch(e => O.empty()),
        task('---8', 'sleep 1').catch(e => O.empty())
    ).catch(e => O.empty()),
    O.concat(
        task('-9', 'sleep 1'),
        task('-10', 'sleep 1')
    ).catch(e => O.empty())
];
// handleParallelStream(parallelStream);

/**
 * The default, series stream will halt upon any failures.
 * This bubbles up, so that if 5 fails, all siblings halt and the parent
 * halts too.
 * @type {*[]}
 */
var seriesStream = [
    task('-1', `sleep 1`),
    task('-2', 'sleep 1'),
    O.merge(
        task('---3', 'sleep 1'),
        task('---4', 'sleep'),
        O.concat(task('---5', 'sleep 1'), task('------6', 'sleep 1'), task('---------7', 'sleep 1')),
        task('---8', 'sleep 1')
    ),
    O.concat(
        task('-9', 'sleep 1'),
        task('-10', 'sleep 1')
    )
];

/**
 * No fail stream still runs tasks in series, but a failure in any individual
 * branch will not cause the parent/siblings to fail
 * @type {*[]}
 */
var noFailStream = [
    task('-1', `sleep`).catch(e => empty()),
    task('-2', 'sleep 1').catch(e => empty()),
    O.merge(
        task('---3', 'sleep 1').catch(e => empty()),
        task('---4', 'sleep 1').catch(e => empty()),
        O.concat(task('---5', 'sleep 1'), task('------6', 'sleep 1'), task('---------7', 'sleep 1')).catch(e => empty()),
        task('---8', 'sleep 1').catch(e => empty())
    ),
    O.concat(
        task('-9', 'sleep 1').catch(e => empty()),
        task('-10', 'sleep 1').catch(e => empty())
    )
];
// handleConcatStream(noFailStream);

/**
 * Merge stream will never fail at the top level, so we need to capture
 * output and look at it in the onCompleted callback
 * @param items
 */
function handleParallelStream(items) {
    var subject = new Rx.ReplaySubject(2000);
    Rx.Observable
        .merge(items)
        .subscribe(x => {
            subject.onNext(x);
        }, e => {
            // console.log('er');
            // console.log('error', e);
        }, _ => {
            subject.forEach(function (x) {
                console.log(x)
            })
        });
}

/**
 * Concat stream can fail at any point, so we need to
 * catch when that error occurs
 * @param items
 */
function handleConcatStream(items) {
    var subject = new Rx.ReplaySubject(2000);
    Rx.Observable.from(items)
        .concatAll()
        .catch(e => { // global error
            console.log('Error', 'but got these dope messages before it errored!');
            report('from catch', subject);
            return O.never();
        });
        //3000.556 // push messages into replay subject
        .subscribe(function () {}, e => {}, _ => {
            report('All done', subject);
        });

    function report (from, subject) {
        console.log('reporting from', from);
        subject.forEach(function (x) {
            console.log(x);
        });
    }
}

function task (num, cmd, fail) {
    const obs = Rx.Observable.create(function (observer) {
        console.log(num, '+ running');
        observer.onNext({type: 'start', id: num});
        var errored;
        var emit = cp('sh', ['-c', cmd], {stdio: 'inherit'});

        emit.on('close', function (code) {
            if (code === 0) {
                console.log(num, '√ done');
                observer.onNext({type: 'end', id: num});
                observer.onCompleted();
            } else {
                errored = true;
                console.log(num, 'x ERRORED');
                observer.onNext({type: 'erorr', id: num, error: new Error('none-zero exit request'), exitCode: code});
                observer.onError(new Error('none-zero exit request'));
            }
        }).on('error', function () {
            console.log('error');
        });

        var single = new Rx.SingleAssignmentDisposable();
        var dis = Rx.Disposable.create(function () {
            if (typeof emit.exitCode !== "number") {
                console.log(num, '- disposing cuz no exit code');
                emit.removeAllListeners('close');
                emit.on('close', function () {
                    console.log(num, '> disposed');
                    single.dispose();
                });
                emit.kill('SIGINT');
            } else {
                single.dispose();
            }
        });
        single.setDisposable(dis);
        return single
    });

    return obs;
}

// //
// const TestScheduler = Rx.TestScheduler;
// const just          = O.just;
// const empty         = O.empty;
// const scheduler     = new TestScheduler();
//
// var results = scheduler.startScheduler(function () {
//     return O.from(getTasks(scheduler)).concatAll();
// }, {created: 0, subscribed: 0, disposed: 5000});
// console.log(results.messages);
