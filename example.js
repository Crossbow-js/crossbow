var cb = require('./');
cb({
    input: ['run', 'css'],
    //flags: {
    //    config: 'crossbow.yaml'
    //}
}, function (err, done) {
    if (err) {
        return console.log(err.stack);
    }


    if (done.tasks.invalid.length) {
        console.log(done.tasks.invalid);
    }
});