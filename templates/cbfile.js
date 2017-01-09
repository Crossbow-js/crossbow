const cb = require('crossbow');

cb.task('all', ['sleep', 'hello-world']);

cb.task('sleep@p', [
    '@sh sleep 1',
    '@sh sleep 1',
    '@sh sleep 1'
]);

cb.task('hello-world', [
    '@sh echo $GREETING $JS_OPTIONS_PLACE'
]);

cb.task('serve', function () {
	cb.watch(['*.json'], ['all']);
});

cb.config({
    envPrefix: 'JS'
});

cb.env({
    GREETING: 'Hello'
});

cb.options({
    place: 'world'
});
