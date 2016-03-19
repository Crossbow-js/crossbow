const Rx = require('rx');
const assert = require('assert');
const O = Rx.Observable;
const empty = O.empty;
const TestScheduler = Rx.TestScheduler;
const onNext = Rx.ReactiveTest.onNext;
const onCompleted = Rx.ReactiveTest.onCompleted;

const error = new Error('Some error');

const task = require('./util').task; // dummy task creation
const errorTask = require('./util').errorTask; // dummy task creation
const mergeFn = require('./parallel');
const mergeFnNamed= require('./parallel').mergeFnNamed;

describe('error in merge stream', function () {
    
    it('does not stop siblings', function () {

        const scheduler = new TestScheduler();

        /**
         * Simulation of tasks
         * @type
         */
        const parallelStream = [
            task('1', 100, scheduler),
            O.concat(
                task('2',      100, scheduler),
                errorTask('3', 100, scheduler, error)
            ),
            task('4', 100, scheduler),
            task('5', 100, scheduler),
            task('6', 100, scheduler)
        ];

        /**
         * Expected messages that will be sat waiting in the subject
         * Note, task 3 should never begin
         * @type {*[]}
         */
        const expected = [
            onNext(1,   {type: 'start', name: '1'}),
            onNext(1,   {type: 'start', name: '2'}),
            onNext(1,   {type: 'start', name: '4'}),
            onNext(1,   {type: 'start', name: '5'}),
            onNext(1,   {type: 'start', name: '6'}),
            onNext(101, {type: 'end',   name: '1'}),
            onNext(101, {type: 'end',   name: '2'}),
            onNext(101, {type: 'start', name: '3'}),
            onNext(101, {type: 'end',   name: '4'}),
            onNext(101, {type: 'end',   name: '5'}),
            onNext(101, {type: 'end',   name: '6'}),
            onNext(201, {type: 'error', name: '3', error: error}),
            onCompleted(201)
        ];

        const results = scheduler.startScheduler(function () {
            return mergeFn(parallelStream);
        }, {created: 0, subscribed: 0, disposed: 1000});

        assert.deepEqual(results.messages, expected);
    });
    it('does not stop nested parallel siblings (deep test)', function () {

        const scheduler = new TestScheduler();

        /**
         * Nested task tree, in parallel mode, siblings do
         * not affect each other
         */
        const named = [
            {
                type: 'P',
                items: [
                    {
                        type: 'T', // ok
                        task: task('1', 100, scheduler)
                    },
                    {
                        type: 'T', // ok
                        task: task('2', 100, scheduler)
                    },
                    {
                        type: 'S',
                        items: [
                            {
                                type: 'S',
                                items: [
                                    {
                                        type: 'S',
                                        items: [
                                            {
                                                type: 'S',
                                                items: [
                                                    {
                                                        type: 'T', // ERROR
                                                        task: errorTask('3', 100, scheduler, error)
                                                    },
                                                    {
                                                        type: 'T', // DOES NOT START
                                                        task: task('4', 100, scheduler)
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        type: 'T',
                        task: task('5', 100, scheduler)
                    },
                    {
                        type: 'T',
                        task: errorTask('6', 100, scheduler, error)
                    }
                ]
            }
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
            onNext(1,   {type: 'start', name: '5'}),
            onNext(1,   {type: 'start', name: '6'}),
            onNext(101, {type: 'end',   name: '1'}),
            onNext(101, {type: 'end',   name: '2'}),
            onNext(101, {type: 'error', name: '3', error: error}),
            onNext(101, {type: 'end',   name: '5'}),
            onNext(101, {type: 'error', name: '6', error: error}),
            onCompleted(101)
        ];

        const results = scheduler.startScheduler(function () {
            return mergeFnNamed(named);
        }, {created: 0, subscribed: 0, disposed: 1000});

        assert.deepEqual(results.messages, expected);
    });
});
