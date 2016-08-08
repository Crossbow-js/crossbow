const assert = require('chai').assert;
const cli = require("../");
const TaskTypes = require("../dist/task.resolve").TaskTypes;

describe('task.resolve with --skip', function () {
    it.only('can skip a task', function (done) {
        const runner = cli.getRunner(['build'], {
            tasks: {
                build: ['js', 'css'],
                js: 'test/fixtures/tasks/simple.multi.js',
                css: '@npm sleep 1',
            }
        }, {
            skip: ['css']
        });

        // console.log(runner.tasks.all[0].tasks);

        runner.runner.series().toArray().subscribe(x => {
            // console.log(x.map(x => [x.type]));
            done();
        })

        // assert.equal(runner.tasks.valid[0].tasks.length);
        // console.log(runner.tasks.valid[0].tasks);
        // assert.equal(runner.tasks.valid[0].tasks[0].externalTasks[0].rawInput, 'test/fixtures/tasks/error.js');
        // assert.equal(runner.tasks.valid[0].tasks[0].externalTasks[0].relative, 'test/fixtures/tasks/error.js');
    });
});
