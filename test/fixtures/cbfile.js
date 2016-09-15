var cb = require('../../');
var Rx = require('rx');

cb.config({
	envPrefix: 'JS'
});

cb.options({
	wait: {
		time: '0.3'
	},
	kittie: {
		dev: {
			input: 'some/file.js'
		},
		production: {
			input: 'some/file-2.js'
		}
	}
});

cb.task('shane', ['kittie'], function () {

});

cb.task('kittie', function () {
	// console.log('kittie task');
});

cb.task('build-js', {
	tasks: [
		function (opts, ctx) {
			return Rx.Observable.just('wayhe!').delay(3000, ctx.config.scheduler);
		}
	],
}, function () {

});

cb.task('wait', function (opts, ctx) {
    return Rx.Observable.just('wayhe!').delay(3000, ctx.config.scheduler);
});

cb.task('obj', {
	tasks: ['wait-env'],
	description: "Run from an obj"
});

cb.env({__wait__: '3'});
cb.task('wait-env', function (opts, ctx) {
	return Rx.Observable.just('wayhe!').delay(Number(ctx.input.env.__wait__) * 1000, ctx.config.scheduler);
});

cb.task('multi', ['shane', ['build-js', '@sh sleep 1']]);

