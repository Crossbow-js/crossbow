const cb = require('./');
const bs = require('browser-sync').create();

cb.task('reload', function () {
	bs.reload();
});

cb.adaptor('@bs', (task) => {
	if (task.command === 'reload') {
		bs.reload();
	}
});

cb.task('build-all', ['sass'], function () {
	// some fn that is guaranteed to rnu after sass is complete
});

cb.task('sass', function processSass(options, context) {
	console.log('Running Sass');
});

// cb.watch(['*.json'], ['sass']);

cb.task('serve', ['build-all'], () => {
	bs.init({
		server: 'test/fixtures',
		open: false
	});
	cb.watch(['test/fixtures/*.html'], ['sass', 'reload']);
	cb.watch(['test/fixtures/*.html'], ['sass', () => bs.reload()]);
	cb.watch(['test/fixtures/*.html'], ['sass', bs.reload]);
	cb.watch(['test/fixtures/*.html'], ['sass', '@bs reload']);
});


