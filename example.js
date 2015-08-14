var cb = require('./');
cb.watch(['default'], {config: 'crossbow.yaml'}, function (err, output) {
    console.log(output.tasks);
});