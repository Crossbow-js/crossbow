const Rx = require('rx');
const assert = require('assert');
const O = Rx.Observable;
const TestScheduler = Rx.TestScheduler;
const onNext = Rx.ReactiveTest.onNext;
const onCompleted = Rx.ReactiveTest.onCompleted;

const scheduler = new TestScheduler();

const task = require('./util').task; // dummy task creation
const concatFn = require('./parallel');

describe('successful merge stream (ie: parallel', function () {
    
    it('completes all parallel tasks with access to messages', function () {

        /**
         * Simulation of tasks
         * @type
         */
        const parallelStream = [
            task('1', 100, scheduler),
            task('2', 100, scheduler),
            task('3', 100, scheduler),
            task('4', 100, scheduler)
        ];

        /**
         * Expected messages that will be sat waiting in the subject
         * Note, task 3 should never begin
         * @type {*[]}
         */
        const expected = [
            onNext(1,   {type: 'start', name: '1'}),
            onNext(1,   {type: 'start', name: '2'}),
            onNext(1,   {type: 'start', name: '3'}),
            onNext(1,   {type: 'start', name: '4'}),
            onNext(101, {type: 'end',   name: '1'}),
            onNext(101, {type: 'end',   name: '2'}),
            onNext(101, {type: 'end',   name: '3'}),
            onNext(101, {type: 'end',   name: '4'}),
            onCompleted(101)
        ];

        const results = scheduler.startScheduler(function () {
            return concatFn(parallelStream);
        }, {created: 0, subscribed: 0, disposed: 1000});

        // console.log(results.messages);
        assert.deepEqual(results.messages, expected);
    });
});
