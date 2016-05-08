var cb = require('../../');

cb.options({
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

