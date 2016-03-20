'use strict';


const cb = require('./');
cb.runner(['js', 'css'], require('./examples/crossbow'))
    .parallel()
    .filter(x => typeof x.type === 'string')
    .do(x => {
        console.log(log(x))
    })
    .subscribe();

function log(x) {
    // console.log(x.item);
    return {id: x.item.seqUID, type: x.type, name: x.item.task.taskName}
}
