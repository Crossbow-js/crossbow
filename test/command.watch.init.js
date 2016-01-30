var assert = require('chai').assert;
var watch  = require('../lib/command.watch');
var cli    = require('../');

describe('Initialising runner with task data', function () {
    it('can gather all pre-tasks', function (done) {
        const runner = cli({
            input: ['watch', 'shane'],
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
                                "*.css": ["sass", "js"],
                                "*.js": "js"
                            }
                        }
                    }
                }
            }
        });

        runner.beforeRunner
            .series()
            .subscribe(x => {}, e => {}, _ => {
                done();
            });
    });
});
