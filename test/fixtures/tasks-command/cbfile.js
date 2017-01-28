var cb = require('../../../');
var Rx = require('rx');

cb.task('rx-task', function myFunction(opts, ctx) {
    return Rx.Observable.just('wahoo!').delay(50, ctx.config.scheduler);
});

cb.task('array', ['rx-task']);

cb.task('inline-object', {
    tasks: '@npm webpack'
});

cb.task('with-desc', {
    tasks: '@npm webpack',
    description: 'My Awesome Task'
});

cb.group('docker', {
    up: '@sh docker-compose up -d'
});

cb.task('inline-fn', {
    tasks: [function logger() { console.log('Task!') } ]
});

cb.task('parallel-tasks', ['rx-task', ['with-desc', 'inline-fn']]);