const assert = require('chai').assert;
const cli = require("../");
const createSeq = require("../dist/task.sequence").createSequence;

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
                'build-all': ['js', 'css'],
                'css':       ['@npm sass', '@npm postcss', '@shell ls', 'html'],
                'js':        ['@npm webpack', '@npm uglify src/*.js'],
                'html':      ['@npm HTMLmin', '@npm curl something']
            }
        });

        function pullMany (items, parents) {
            return items.reduce(function (all, task) {
                if (task.runMode === 'parallel' && task.tasks.length) {
                    return all.concat({
                        type: 'Parallel Group',
                        parents: parents,
                        groups: task.tasks.map(task => {
                            if (task.adaptor) {
                                return {tasks: [task]};
                            }
                            if (task.tasks) {
                                return {
                                    parents: parents,
                                    tasks: pullMany(task.tasks, parents.concat(task.taskName))
                                };
                            }
                        })
                    });
                } else {
                    if (task.tasks.length) {
                        return all.concat({
                            type: 'Series Group', parents: parents, items: pullMany(task.tasks, parents.concat(task.taskName))
                        });
                    } else {
                        return all.concat({
                            type: 'Item',
                            parents: parents,
                            task: task
                        });
                    }
                }
            }, []);
        }
        

        const res = pullMany(runner.tasks.valid, []);

        require('fs').writeFileSync('out.json', JSON.stringify(res, null, 4));

        //console.log(runner.sequence[0]);
        //console.log(runner.sequence[1]);
        //console.log(runner.sequence[1].task.taskName);
        //console.log(runner.sequence[2].task.taskName);
        //console.log(runner.sequence[3].task.taskName);
        //console.log(runner.sequence[4].task.taskName);

        //assert.equal(runner.sequence[0].sequenceTasks.length, 1);
        //assert.equal(runner.tasks.valid[0].taskName, '@npm ls');
        //assert.equal(runner.tasks.valid[0].command, 'ls');

    });
});
