const assert = require('chai').assert;
const utils = require('../../utils');
const Rx = require('rx');
const watchEventTypes = require('../../../dist/command.watch').WatchCommandEventTypes;
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
    it('runs a tasks following a file-changes', function () {

        const input = {
            watch: {
                default: {
                    "*.css": ["css"],
                },
                dev: {
                    "*.html": "html-min"
                }
            },
            tasks: {
                css: function (opts) {
                    // console.log('CSS task', opts);
                },
                js: function (opts) {
                    // console.log('JS task', opts);
                }
            }
        };

        const scheduler = new Rx.TestScheduler();
        const output    = new Rx.ReplaySubject(100);
        const cli       = {};

        const fileEvents = scheduler.createColdObservable(
            onNext(100, {event: 'change', path: 'style.css',     watcherUID: 'default-0'}),
            onNext(150, {event: 'change', path: 'style.css.map', watcherUID: 'default-0'})
        );

        cli.input = ['watch', 'default'];
        cli.flags = {
            scheduler: scheduler,
            outputObserver: output,
            fileChangeObserver: fileEvents
        };

        const runner = cb.default(cli, input);

        const subscription = scheduler.startScheduler(() => {
            return runner;
        }, {created: 0, subscribed: 0, disposed: 2000});

        assert.deepEqual(
            subscription.messages.map(x => x.value.value.type),
            [
                watchEventTypes.WatchTaskReport,
                watchEventTypes.WatchTaskReport,
                watchEventTypes.WatchRunnerComplete,
                watchEventTypes.WatchTaskReport,
                watchEventTypes.WatchTaskReport,
                watchEventTypes.WatchRunnerComplete
            ]
        );
    });
});
