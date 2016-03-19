const Rx = require('rx');
const assert = require('assert');
const O = Rx.Observable;
const TestScheduler = Rx.TestScheduler;
const onNext = Rx.ReactiveTest.onNext;
const onCompleted = Rx.ReactiveTest.onCompleted;

const scheduler = new TestScheduler();

const task = require('./util').task; // dummy task creation
const concatFn = require('./series');

describe('successful series stream', function () {
    
    it('completes with messages', function () {
        
        /**
         * Simulation of tasks
         * @type
         */
        const seriesStream = [
            task('1', 100, scheduler),
            task('2', 100, scheduler),
            task('3', 100, scheduler),
            task('4', 100, scheduler),
            O.concat([
                task('5', 100, scheduler),
                task('6', 100, scheduler)
            ]),
            task('7', 100, scheduler)
        ];

        /**
         * Expected messages that will be sat waiting in the subject
         * Note, task 3 should never begin
         * @type {*[]}
         */
        const expected = [
            onNext(1, {type: 'start', name: '1'}),
            onNext(101, {type: 'end', name: '1'}),
            onNext(101, {type: 'start', name: '2'}),
            onNext(201, {type: 'end', name: '2'}),
            onNext(201, {type: 'start', name: '3'}),
            onNext(301, {type: 'end', name: '3'}),
            onNext(301, {type: 'start', name: '4'}),
            onNext(401, {type: 'end', name: '4'}),
            onNext(401, {type: 'start', name: '5'}),
            onNext(501, {type: 'end', name: '5'}),
            onNext(501, {type: 'start', name: '6'}),
            onNext(601, {type: 'end', name: '6'}),
            onNext(601, {type: 'start', name: '7'}),
            onNext(701, {type: 'end', name: '7'}),
            onCompleted(701)
        ];

        const results = scheduler.startScheduler(function () {
            return concatFn(seriesStream);
        }, {created: 0, subscribed: 0, disposed: 1000});

        assert.deepEqual(results.messages, expected);
    });
});
