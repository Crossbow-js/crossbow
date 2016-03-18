//'use strict';
//
var Rx = require('rx');
var O = Rx.Observable;
var cp = require('child_process').spawn;

function getcp (num, cmd, fail) {
    const obs = Rx.Observable.create(function (observer) {
        console.log(num, '+ running');
        var errored;
        var emit = cp('sh', ['-c', cmd], {stdio: 'inherit'});

        emit.on('close', function (code) {
            if (code === 0) {
                console.log(num, '√ done');
                observer.onCompleted();
            } else {
                errored = true;
                console.log(num, 'x errored');
                observer.onError(new Error('none-zero exit request'));
            }
        }).on('error', function () {
            console.log('error');
        });

        var dis = Rx.Disposable.create(function () {
            if (typeof emit.exitCode !== "number") {
                console.log(num, '- disposing cuz no exit code');
                emit.removeAllListeners('close');
                emit.on('close', function () {
                    console.log(num, '> disposed');
                    dis.dispose();
                });
                emit.kill('SIGINT');
            } else {
                console.log(num, 'EXIT CODE', emit.exitCode);
            }
        });
        return dis;
    });

    return obs;
}

var stream = Rx.Observable.merge(
    getcp(1, `sleep 1`),
    getcp(2, 'sleep 1'),
    O.merge(
        getcp(3, 'sleep'),
        getcp(4, 'sleep 1')
    ).catch(x => O.empty()),
    O.concat(
        getcp(5, 'sleep 1'),
        getcp(6, 'sleep 1')
    )
)
.subscribe(x => {
    console.log(x);
}, e => {
    // console.log('error', e);
}, _ => {
    console.log('ALL DONE');
});

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