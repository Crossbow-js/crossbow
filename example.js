//'use strict';
//
var Rx = require('rx');
var O = Rx.Observable;

function getTask(name, time, schedule) {
    return O.create(observer => {
        O.timer(time, schedule || null)
            .subscribe(x => {
                console.log('+', name);
                observer.onNext(x);
            }, e => {}, _ => {
                observer.onCompleted();
            });
    })
}

function getError(name, time, scheduler) {
    return O.create(observer => {
        O.timer(time, scheduler || null)
            .subscribe(x => {
                console.log('-', name);
                observer.onError(new Error('Some proble'));
            });
    });
}

//function fac(name) {
//    return O.create(obs => {
//        console.log('+ ', name);
//        let i = setTimeout(function () {
//        	obs.onNext(name);
//        	obs.onCompleted();
//        }, 500);
//        return () => {
//            if (i) {
//                console.log('- ', name);
//                clearTimeout(i);
//            }
//        }
//    });
//}
const onNext  = Rx.ReactiveTest.onNext;
const onError = Rx.ReactiveTest.onError;

function getTasks (scheduler) {
    return [
        getTask('1', 100, scheduler),
        getTask('2', 100, scheduler),
        getError('3', 100, scheduler),
        O.concat(
            getTask('4', 100, scheduler),
            getTask('5', 100, scheduler),
            O.merge(
                getTask('6', 100, scheduler),
                getTask('7', 100, scheduler)
            )
        )
    ];
}

////const q = O.from(task1).concatAll();
////
////const sub = q.subscribe(x => {
////        //console.log('+ ', x)
////    }, e => {
////        console.error(e)
////    }, _ => {
////        console.log('DONE');
////    });
////
////setTimeout(function () {
////	sub.dispose();
////}, 600);
//
const TestScheduler = Rx.TestScheduler;
const just          = O.just;
const empty         = O.empty;
const scheduler     = new TestScheduler();

var results = scheduler.startScheduler(function () {
    return O.from(getTasks(scheduler)).concatAll();
}, {created: 0, subscribed: 0, disposed: 5000});
console.log(results.messages);