const cb = require('./');

cb.task('build-all', ['sass'], function () {
	// some fn that is guaranteed to rnu after sass is complete
});

cb.task('sass', function processSass(options, context) {
	console.log('Running Sass');
});
