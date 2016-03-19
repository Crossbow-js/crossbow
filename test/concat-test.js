const Rx     = require('rx');
const assert = require('assert');
const O      = Rx.Observable;
const concat = O.concat;
const create = O.create;
const merge  = O.merge;
const TestScheduler = Rx.TestScheduler;
const onNext = Rx.ReactiveTest.onNext;
const onError = Rx.ReactiveTest.onError;
const onCompleted = Rx.ReactiveTest.onCompleted;
const just        = O.just;
const empty       = O.empty;
const scheduler   = new TestScheduler();
const error = new Error('Some error');
const concatFn = require('./series');


/**
 * Helper to generate time-based tasks with a
 * given scheduler
 * @param scheduler
 * @returns {*[]}
 */
function getTasks(scheduler) {
    return [
        task('1', 100, scheduler),
        task('2', 100, scheduler),
        task('3', 100, scheduler),
        task('4', 100, scheduler),
        concat([
            task('5', 100, scheduler),
            task('6', 100, scheduler)
        ]),
        task('7', 100, scheduler)
    ]
}

/**
 * Expected messages that will be sat waiting in the subject
 * Note, task 3 should never begin
 * @type {*[]}
 */
var expected = [
    onNext(1,   {type: 'start', name: '1'}),
    onNext(101, {type: 'end',   name: '1'}),
    onNext(101, {type: 'start', name: '2'}),
    onNext(201, {type: 'end',   name: '2'}),
    onNext(201, {type: 'start', name: '3'}),
    onNext(301, {type: 'end',   name: '3'}),
    onNext(301, {type: 'start', name: '4'}),
    onNext(401, {type: 'end',   name: '4'}),
    onNext(401, {type: 'start', name: '5'}),
    onNext(501, {type: 'end',   name: '5'}),
    onNext(501, {type: 'start', name: '6'}),
    onNext(601, {type: 'end',   name: '6'}),
    onNext(601, {type: 'start', name: '7'}),
    onNext(701, {type: 'end',   name: '7'}),
    onCompleted(701)
];

const results = scheduler.startScheduler(function () {
    return concatFn(getTasks(scheduler));
}, {created: 0, subscribed: 0, disposed: 5000});
// console.log(results.messages);
// console.log(expected[4]);
// console.log(results.messages.map(x=>x.value));
assert.deepEqual(results.messages, expected);

function errorTask (name, time, scheduler) {
    return create(observer => {
        observer.onNext({type: 'start', name});
        const sub = O.timer(time, scheduler || null)
            .subscribe(x => {
            }, function () {
            }, function () {
                observer.onNext({type: 'error', name, error});
                observer.onError(new Error('Some error'));
            });
        return () => {
            sub.dispose();
        };
    });
}

function task(name, time, scheduler) {
    return create(observer => {
        observer.onNext({type: 'start', name});
        const sub = O.timer(time, scheduler || null)
            .subscribe(x => {
                // observer.onNext({type: 'value', name});
            }, function () {

            }, function () {
                observer.onNext({type: 'end', name});
                observer.onCompleted();
            });
        return () => {
            sub.dispose();
        };
    });
}
