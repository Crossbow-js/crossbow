var assert = require('chai').assert;
var watch = require('../lib/command.watch');
var resolve = require('../lib/resolve-watch-tasks');
var gatherTasks = require('../lib/gather-watch-tasks');
const yml = require('js-yaml');

describe('Resolving watch tasks', function () {
    it.only('can resolve default tasks when none given', function () {
        var watchTasks = resolve({
                input: ['watch'],
                flags: {handoff: true}
            },
            gatherTasks({
                watch: {
                    before: ['js'],
                    tasks: {
                        default: {
                            "*.css": ["sass", "js"],
                            "*.js": "js"
                        }
                    }
                }
            }));

        console.log(watchTasks);

        //assert.equal(tasks.default.watchers.length, 2);
        //assert.equal(tasks.default.watchers[0].patterns.length, 1);
        //assert.equal(tasks.default.watchers[0].patterns[0], "*.css");
        //assert.equal(tasks.default.watchers[0].tasks[0], "sass");
        //assert.equal(tasks.default.watchers[0].tasks[1], "js");
    });
});
