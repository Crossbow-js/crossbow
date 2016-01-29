//var assert = require('chai').assert;
//var watch  = require('../lib/command.watch');
//var cli    = require('../');
//
//describe('Gathering watch tasks', function () {
//    it('can gather tasks in shorthand format', function (done) {
//        const runner = cli({
//            input: ['watch'],
//            flags: {
//                handoff: true
//            }
//        }, {
//            crossbow: {
//                watch: {
//                    tasks: {
//                        default: {
//                            "*.css": ["sass", "js"],
//                            "*.js": "js"
//                        }
//                    }
//                }
//            }
//        });
//
//        console.log(runner);
//
//        done();
//        //assert.equal(tasks.default.watchers.length, 2);
//        //assert.equal(tasks.default.watchers[0].patterns.length, 1);
//        //assert.equal(tasks.default.watchers[0].patterns[0], "*.css");
//        //assert.equal(tasks.default.watchers[0].tasks[0], "sass");
//        //assert.equal(tasks.default.watchers[0].tasks[1], "js");
//    });
//});
