var cb = require('./');

cb.runner(['lint', 'unit'])
    //.series()
    .parallel()
    .do(x => console.log(x.type))
    .where(x => x.type === 'end')
    .toArray()
    .subscribe(function (x) {
        console.log(x);
    });
