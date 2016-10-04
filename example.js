const Rx = require('rx');
var Observable = Rx.Observable,
    TestScheduler = Rx.TestScheduler,
    onNext = Rx.ReactiveTest.onNext,
    onError = Rx.ReactiveTest.onError,
    onCompleted = Rx.ReactiveTest.onCompleted,
    subscribe = Rx.ReactiveTest.subscribe,
    created = Rx.ReactiveTest.created,
    disposed = Rx.ReactiveTest.disposed;

var names = [
    'shane',
    'kittie'
];

const scheduler = new Rx.TestScheduler();

var xs1 = scheduler.createHotObservable(
    onNext(100, {name: 'kittie 1'}),
    onNext(110, {name: 'kittie 2'}),
    onNext(120, {name: 'kittie 3'})
);

var xs2 = scheduler.createHotObservable(
    onNext(101, {name: 'shane 1'}),
    onNext(102, {name: 'shane 2'}),
    onNext(140, {name: 'shane 3'})
);

const lax = Rx.Observable.from([xs1, xs2]).mergeAll();

// var xs3 = scheduler.createHotObservable(
//     onNext(101, {name: 'shane'})
// );
//
// var out = xs.flatMap(x => {
//     return xs3
// });
//

// console.log(xs1);
const results = scheduler.startScheduler(function () {
    return xs1;
}, {created: 0, subscribed: 0, disposed: 2000});

console.log(results.messages);
