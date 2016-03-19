const Rx = require('rx');
const assert = require('assert');
const O = Rx.Observable;

const TestScheduler = Rx.TestScheduler;
const onNext = Rx.ReactiveTest.onNext;
const scheduler = new TestScheduler();

const error = new Error('Some error');

const concatFn = require('./series');
const task = require('./util').task;
const errorTask = require('./util').errorTask;

describe('Series stream with error', function () {
    it('should terminate when any task fails', function () {

        /**
         * Simulate task number 5 erroring
         */
        const concatStreamWithError = [
            task('1', 100, scheduler),
            task('2', 100, scheduler),
            task('3', 100, scheduler),
            task('4', 100, scheduler),
            O.concat([
                errorTask('5', 100, scheduler, error),
                task('6', 100, scheduler)
            ]),
            task('7', 100, scheduler),
            task('8', 100, scheduler),
            task('9', 100, scheduler),
            task('10', 100, scheduler)
        ];

        /**
         * Expected messages that will be sat waiting in the subject
         * @type {*[]}
         */
        var expected = [
            onNext(1, {type: 'start', name: '1'}),
            onNext(101, {type: 'end', name: '1'}),
            onNext(101, {type: 'start', name: '2'}),
            onNext(201, {type: 'end', name: '2'}),
            onNext(201, {type: 'start', name: '3'}),
            onNext(301, {type: 'end', name: '3'}),
            onNext(301, {type: 'start', name: '4'}),
            onNext(401, {type: 'end', name: '4'}),
            onNext(401, {type: 'start', name: '5'}),
            onNext(501, {type: 'error', name: '5', error: error})
        ];

        const results = scheduler.startScheduler(function () {
            return concatFn(concatStreamWithError);
        }, {created: 0, subscribed: 0, disposed: 5000});
// console.log(results.messages);
// console.log(expected[4]);
// console.log(results.messages.map(x=>x.value));
        assert.deepEqual(results.messages, expected);
    });
});

