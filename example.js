// // const Rx = require('rx');
// //
// // Rx.Observable.mergeDelayError([
// //     Rx.Observable.timer(1000).map(x => 1),
// //     Rx.Observable.timer(2000).map(x => 2),
// //     Rx.Observable.concat([
// //         Rx.Observable.timer(1000).map(x => 1.1),
// //         Rx.Observable.timer(2000).map(x => 1.2)
// //     ]),
// //     Rx.Observable.timer(3000).map(x => 4),
// //     Rx.Observable.timer(4000).map(x => 5)
// // ]).subscribe(x => {
// //
// //     console.log(x);
// // });
//
// const Rx            = require('rx');
// const Observable    = Rx.Observable;
// const TestScheduler = Rx.TestScheduler;
// const onNext        = Rx.ReactiveTest.onNext;
// const onCompleted   = Rx.ReactiveTest.onCompleted;
// const onError       = Rx.ReactiveTest.onError;
//
// var error = new Error();
//
// var scheduler = new TestScheduler();
//
// var o1 = scheduler.createHotObservable(
//
//     onNext(210, 2),
//     onError(250, error)
// );
// var o2 = scheduler.createHotObservable(
//     onNext(160, 1),
//     onCompleted(260)
// );
//
// var results = scheduler.startScheduler(function() {
//     return Observable.mergeDelayError(o1, o2);
// });
//
// console.log(results.messages);
//
// // results.messages.assertEqual(
// //     onNext(210, 2),
// //     onError(260, error)
// // );

const exec = require('child_process').exec;
const stdout = exec('node dist/index run "@npm sleep"', function (err, stdout, stderr) {
    console.log(err.code);
});
// console.log(stdout.toString());