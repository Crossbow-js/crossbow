const i = require('./out.json');
var a   = require('archy');
const compile = require('./dist/logger').compile;
var s   = a({
    label : 'beep',
    nodes : [
        'ity',
        {
            label : 'boop',
            nodes : [
                {
                    label : 'o_O',
                    nodes : [
                        {
                            label : 'oh',
                            nodes : [ 'hello', 'puny' ]
                        },
                        'human'
                    ]
                },
                'party\ntime!'
            ]
        }
    ]
});
const out = getTasks(i, []);
console.log(a({label: 'Crossbow Config', nodes: out}));

function getTasks (tasks, initial) {
    return tasks.reduce((acc, task) => {
        return acc.concat({
            label: compile(`{red:x ${task.taskName}}\n{red:x} {bold:Documentation} `),
            nodes: getTasks(task.tasks, [])
        });
    }, initial);
}
