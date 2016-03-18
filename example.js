//'use strict';
//
var Rx = require('rx');
var O = Rx.Observable;
var empty = O.empty;
var concat = O.concat;
var merge = O.merge;
var cp = require('child_process').spawn;

var subject = new Rx.ReplaySubject(2000);
var sub$ = subject.share();

function getcp (num, cmd, fail) {
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

// handleMergeStream([
//     getcp('-1', `sleep 1`).catch(e => O.empty()),
//     getcp('-2', 'sleep 2').catch(e => O.empty()),
//     O.merge(
//         getcp('---3', 'sleep 1').catch(e => O.empty()),
//         getcp('---4', 'sleep').catch(e => O.empty()),
//         O.concat(getcp('---5', 'sleep 1'), getcp('------6', 'sleep 1'), getcp('---------7', 'sleep 1')).catch(e => O.empty()),
//         getcp('---8', 'sleep 1').catch(e => O.empty())
//     ).catch(e => O.empty()),
//     O.concat(
//         getcp('-9', 'sleep'),
//         getcp('-10', 'sleep 1')
//     ).catch(e => O.empty())
// ]);

/**
 * Merge stream will never fail at the top level, so we need to capture
 * output and look at it in the onCompleted callback
 * @param items
 */
function handleMergeStream(items) {
    Rx.Observable.merge(items)
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
        })
        .do(subject) // push messages into replay subject
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

handleConcatStream([
    getcp('-1', `sleep 1`),
    getcp('-2', 'sleep 1'),
    O.merge(
        getcp('---3', 'sleep 1'),
        getcp('---4', 'sleep'),
        O.concat(getcp('---5', 'sleep 1'), getcp('------6', 'sleep 1'), getcp('---------7', 'sleep 1')),
        getcp('---8', 'sleep 1')
    ),
    O.concat(
        getcp('-9', 'sleep 1'),
        getcp('-10', 'sleep 1')
    )
]);


// var noFailStream = [
//     getcp('-1', `sleep 1`).catch(e => empty()),
//     getcp('-2', 'sleep 1').catch(e => empty()),
//     O.merge(
//         getcp('---3', 'sleep 1').catch(e => empty()),
//         getcp('---4', 'sleep 1').catch(e => empty()),
//         O.concat(getcp('---5', 'sleep'), getcp('------6', 'sleep 1'), getcp('---------7', 'sleep 1')).catch(e => empty()),
//         getcp('---8', 'sleep 1').catch(e => empty())
//     ),
//     O.concat(
//         getcp('-9', 'sleep 1').catch(e => empty()),
//         getcp('-10', 'sleep 1').catch(e => empty())
//     )
// ];
//
// const sub = Rx.Observable
//     .concat(noFailStream)
//     .subscribe(x => {
//         console.log(x);
//     }, e => {
//         // console.log('error', e);
//     }, _ => {
//         console.log('ALL DONE');
//     });



// setTimeout(function () {
// 	stream.dispose();
// }, 500);
// function getTask(name, time, schedule) {
//     return O.create(observer => {
//         O.timer(time, schedule || null)
//             .subscribe(x => {
//                 console.log('+', name);
//                 observer.onNext(x);
//             }, e => {}, _ => {
//                 observer.onCompleted();
//             });
//     })
// }
//
// function getError(name, time, scheduler) {
//     return O.create(observer => {
//         O.timer(time, scheduler || null)
//             .subscribe(x => {
//                 console.log('-', name);
//                 observer.onError(new Error('Some proble'));
//             });
//     });
// }
//
// //function fac(name) {
// //    return O.create(obs => {
// //        console.log('+ ', name);
// //        let i = setTimeout(function () {
// //        	obs.onNext(name);
// //        	obs.onCompleted();
// //        }, 500);
// //        return () => {
// //            if (i) {
// //                console.log('- ', name);
// //                clearTimeout(i);
// //            }
// //        }
// //    });
// //}
// const onNext  = Rx.ReactiveTest.onNext;
// const onError = Rx.ReactiveTest.onError;
//
// function getTasks (scheduler) {
//     return [
//         getTask('1', 100, scheduler),
//         getTask('2', 100, scheduler),
//         getError('3', 100, scheduler),
//         O.concat(
//             getTask('4', 100, scheduler),
//             getTask('5', 100, scheduler),
//             O.merge(
//                 getTask('6', 100, scheduler),
//                 getTask('7', 100, scheduler)
//             )
//         )
//     ];
// }
//
// ////const q = O.from(task1).concatAll();
// ////
// ////const sub = q.subscribe(x => {
// ////        //console.log('+ ', x)
// ////    }, e => {
// ////        console.error(e)
// ////    }, _ => {
// ////        console.log('DONE');
// ////    });
// ////
// ////setTimeout(function () {
// ////	sub.dispose();
// ////}, 600);
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
