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

        const out = utils.getFileWatcher(['default'], {
            watch: {
                default: {
                    "*.css": ["css"],
                },
                dev: {
                    "*.html": "html-min"
                }
            },
            tasks: {
                css: utils.task(100),
                js: utils.task(100)
            }
        }, [
            onNext(100, {event: 'change', path: 'style.css',     watcherUID: 'default-0'}),
            onNext(300, {event: 'change', path: 'style.css',     watcherUID: 'default-0'})
        ]);


        assert.deepEqual(
            out.subscription.messages.map(x => x.value.value.type),
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
    it('runs a task with debounce', function () {

        const out = utils.getFileWatcher(['default'], {
            watch: {
                options: {
                    debounce: 500
                },
                default: {
                    "*.css": ["css"],
                },
                dev: {
                    "*.html": "html-min"
                }
            },
            tasks: {
                css: utils.task(300)
            }
        }, [
            onNext(100, {event: 'change', path: 'style.css',     watcherUID: 'default-0'})
        ]);

        assert.deepEqual(out.subscription.messages.map(x => x.time), [
            600,
            900,
            900
        ]);
    });
    it('runs a task with throttle', function () {

        const out = utils.getFileWatcher(['default'], {
            watch: {
                options: {
                    throttle: 100
                },
                default: {
                    "*.css": ["css"],
                },
                dev: {
                    "*.html": "html-min"
                }
            },
            tasks: {
                css: utils.task(100)
            }
        }, [
            onNext(100, {event: 'change', path: 'style.css', watcherUID: 'default-0'}),
            onNext(101, {event: 'change', path: 'style.css', watcherUID: 'default-0'}),
            onNext(102, {event: 'change', path: 'style.css', watcherUID: 'default-0'})
        ]);

        const outTimes = out.subscription.messages.filter(x => x.value.value.type === 'WatchTaskReport').map(x => x.time);
        assert.deepEqual(outTimes, [
            100, // start 1
            200 // end 2
        ]);
    });
    it('can block the running of tasks', function () {

        const out = utils.getFileWatcher(['default'], {
            watch: {
                default: {
                    options: {
                        block: true
                    },
                    "*.css": ["css"],
                },
                dev: {
                    "*.html": "html-min"
                }
            },
            tasks: {
                css: utils.task(1000)
            }
        }, [
            onNext(100, {event: 'change', path: 'style.css', watcherUID: 'default-0'}),
            onNext(200, {event: 'change', path: 'style.css', watcherUID: 'default-0'})
        ]);

        const outTimes = out.subscription.messages.filter(x => x.value.value.type === 'WatchTaskReport');
        assert.equal(outTimes.length, 2);
    });
    it('can block the running of tasks & continue after completion', function () {

        const out = utils.getFileWatcher(['default'], {
            watch: {
                default: {
                    options: {
                        block: true
                    },
                    "*.css": ["css"],
                },
                dev: {
                    "*.html": "html-min"
                }
            },
            tasks: {
                css: utils.task(1000)
            }
        }, [
            // 1 should make it
            onNext(100,  {event: 'change', path: 'style.css', watcherUID: 'default-0'}),

            // these should be ignored
            onNext(101,  {event: 'change', path: 'style.css', watcherUID: 'default-0'}),
            onNext(102,  {event: 'change', path: 'style.css', watcherUID: 'default-0'}),
            onNext(103,  {event: 'change', path: 'style.css', watcherUID: 'default-0'}),

            // this should make it
            onNext(1101, {event: 'change', path: 'style.css', watcherUID: 'default-0'})
        ]);

        const watchReports = out.subscription.messages.filter(x => x.value.value.type === 'WatchTaskReport');
        assert.equal(watchReports.length, 4);

        const outTimes = out.subscription.messages.filter(x => x.value.value.type === 'WatchTaskReport').map(x => x.time);
        assert.deepEqual(outTimes, [
            100,  // 1 start
            1100, // 1 end (1000ms task)
            1101,  // 2 start
            2101  // 2 start
        ])
    });
    it('accepts --block as CLI flag', function () {

        const out = utils.getFileWatcher(['default'], {
            watch: {
                default: {
                    "*.css": ["css"],
                },
                dev: {
                    "*.html": "html-min"
                }
            },
            tasks: {
                css: utils.task(1000)
            }
        }, [
            // 1 should make it
            onNext(100,  {event: 'change', path: 'style.css', watcherUID: 'default-0'}),

            // these should be ignored
            onNext(101,  {event: 'change', path: 'style.css', watcherUID: 'default-0'}),
            onNext(102,  {event: 'change', path: 'style.css', watcherUID: 'default-0'}),
            onNext(103,  {event: 'change', path: 'style.css', watcherUID: 'default-0'}),

            // this should make it
            onNext(1101, {event: 'change', path: 'style.css', watcherUID: 'default-0'})
        ], {
            block: true
        });

        const watchReports = out.subscription.messages.filter(x => x.value.value.type === 'WatchTaskReport');
        assert.equal(watchReports.length, 4);

        const outTimes = out.subscription.messages.filter(x => x.value.value.type === 'WatchTaskReport').map(x => x.time);
        assert.deepEqual(outTimes, [
            100,  // 1 start
            1100, // 1 end (1000ms task)
            1101,  // 2 start
            2101  // 2 start
        ])
    });
});
