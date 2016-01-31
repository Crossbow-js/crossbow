const assert = require('chai').assert;
const watch = require('../lib/command.watch');
const cli = require('../');
const fileWatcher = require('../lib/file-watcher');
const Rx = require('rx');
const sinon = require('sinon');

describe('Initialising runner with task data', function () {

    it.skip('can gather all pre-tasks', function () {
        this.timeout(50000);
        const item1 = Rx.Observable.create(obs => {
            //obs.onNext({
            //    namespace: 'default',
            //    event: 'change',
            //    path: 'item.html',
            //    item: {},
            //    tasks: ['css', 'js'],
            //    uid: 0
            //});
            //obs.onNext({
            //    namespace: 'default',
            //    event: 'change',
            //    path: 'item.html',
            //    item: {},
            //    tasks: ["css", "js"],
            //    uid: 0
            //});
        }).share();

        //const stub = sinon.stub(fileWatcher, 'getWatchers')
        //    .returns(Rx.Observable.merge(item1));

        const runner = cli({
            input: ['watch'],
            flags: {
                handoff: true
            }
        }, {
            crossbow: {
                watch: {
                    tasks: {
                        default: {
                            before: ['test/fixtures/tasks/simple.js'],
                            watchers: {
                                "*.css:test/fixtures/*.html": ["css", "js"],
                                "*.js": ["js"]
                            }
                        }
                    }
                },
                tasks: {
                    css: ['test/fixtures/tasks/simple2.js'],
                    js: ['test/fixtures/tasks/slow1.js']
                }
            }
        })
    });
});
