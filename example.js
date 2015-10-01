var cb = require('./');
cb({
    input: ['run', 'sass'],
    flags: {
        config: 'crossbow.yaml',
        logLevel: 'info'
    }
}, function (err, done) {

    if (err) {
        return console.log(err.stack);
    }

    console.log(done.tasks);

    if (done.tasks.invalid.length) {
        console.log(done.tasks.invalid);
    }
});