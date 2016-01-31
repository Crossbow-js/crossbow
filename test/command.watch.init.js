const assert = require('chai').assert;
const watch  = require('../lib/command.watch');
const cli    = require('../');
const Rx     = require('rx');

describe('Initialising runner with task data', function () {
    it.only('can gather all pre-tasks', function (done) {
        this.timeout(50000);
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
                                "*.js": "js"
                            }
                        }
                    }
                },
                tasks: {
                    css: ['test/fixtures/tasks/simple2.js'],
                    js: ['test/fixtures/tasks/stream.js']
                }
            }
        });


        //console.log(runner.watcherTasks);
        //done();
    });
});
