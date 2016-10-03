const assert = require('chai').assert;
const utils = require('../../utils');
const Rx = require('rx');
const cb = require('../../../dist/index');
var Observable = Rx.Observable,
    TestScheduler = Rx.TestScheduler,
    onNext = Rx.ReactiveTest.onNext,
    onError = Rx.ReactiveTest.onError,
    onCompleted = Rx.ReactiveTest.onCompleted,
    subscribe = Rx.ReactiveTest.subscribe,
    created = Rx.ReactiveTest.created,
    disposed = Rx.ReactiveTest.disposed;

describe('responding to file change events', function () {
    it('runs a single task following a file-change', function () {

        const input = {
            watch: {
                default: {
                    "*.css": ["css"]
                },
                dev: {
                    "*.html": "html-min"
                }
            },
            tasks: {
                css: function (opts) {
                    console.log('CSS task', opts);
                }
            }
        };

        const scheduler = new Rx.TestScheduler();
        const output    = new Rx.ReplaySubject(100);
        const output2    = new Rx.ReplaySubject(100, scheduler);

        const cli       = {};

        cli.input = ['watch', 'default'];
        cli.flags = {
            scheduler: scheduler,
            outputObserver: output,
            fileChangeObserver: output2
        };

        output2.onNext({name: 'shane'});
        scheduler.advanceBy(2000);
        output2.onNext({name: 'kittie'});
        const runner       = cb.default(cli, input);
        const subscription = scheduler.startScheduler(() => {
            return runner;
        }, {created: 0, subscribed: 0, disposed: 200000});

        console.log(subscription.messages[0].value.error.stack);

        // assert.equal(runner.beforeTasks.tasks.valid.length, 1);
        // assert.equal(runner.beforeTasks.tasks.valid[0].taskName, 'js');
        // assert.equal(runner.beforeTasks.tasks.valid[0].tasks[0].taskName, 'test/fixtures/tasks/observable.js');
    });
});
