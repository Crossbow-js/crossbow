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

cb.task('wait', [{
	input: '@sh sleep $JS_OPTIONS_WAIT_TIME'
}])

cb.env({__wait__: '0.3'});
cb.task('wait-env', ['@sh sleep $__wait__']);

