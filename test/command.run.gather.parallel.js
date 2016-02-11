const assert = require('chai').assert;
const cli = require("../");

function handoff(cmd, input, cb) {
    return cli({
        input: ['run'].concat(cmd),
        flags: {
            handoff: true
        }
    }, input, cb);
}

describe('Gathering run tasks, grouped by runMode', function () {
    it.only('can gather tasks when parallel syntax used', function () {
        var runner = handoff(['build-all@p'], {
            tasks: {
                'build-all@p': ['css', 'js'],
                'css': ['@npm sass', '@npm postcss', '@shell ls'],
                'js':  ['@npm webpack', '@npm uglify src/*.js']
            }
        });

        //console.log(runner.sequence[0].task.taskName);
        //console.log(runner.sequence[1].task.taskName);
        //console.log(runner.sequence[2].task.taskName);
        //console.log(runner.sequence[3].task.taskName);
        //console.log(runner.sequence[4].task.taskName);

        //assert.equal(runner.sequence[0].sequenceTasks.length, 1);
        //assert.equal(runner.tasks.valid[0].taskName, '@npm ls');
        //assert.equal(runner.tasks.valid[0].command, 'ls');
    });
});
