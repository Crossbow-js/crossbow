var cb = require('../../');

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
	console.log('kittie task');
});

cb.task('build-js', {
	adaptor: 'npm',
	command: 'webpack example.js'
}, function () {
    console.log('all done');
});

cb.task('wait', [{
	input: '@sh sleep $JS_OPTIONS_WAIT_TIME'
}]);

cb.task('obj', {
	tasks: ['wait-env'],
	description: "Run from an obj"
});

cb.env({__wait__: '0.3'});
cb.task('wait-env', ['@sh sleep $__wait__']);

cb.task('multi', ['shane', ['build-js', '@sh sleep 1']]);

