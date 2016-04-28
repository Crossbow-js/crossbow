// 'use strict';


const cb = require('./');
cb.runner(['js', 'css', 'shane'], require('./examples/crossbow'))
    .parallel()
    .do(log)
    .toArray()
    .subscribe(function (reports) {
        require('fs').writeFileSync('reports.json', JSON.stringify(reports, null, 2));
        // console.log(reports);
    });

function log(x) {
    // console.log(`(${x.item.seqUID}) - ${x.type} - ${x.item.task.taskName}`);
    // console.log(`${x.item.seqUID} `);
}
// var meow = require('meow');
