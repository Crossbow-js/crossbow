const cb = require('./');
const bs = require('browser-sync').create();
const merge = require('rx').Observable.merge;

cb.task('reload', function () {
	bs.reload();
});

cb.task('build-all', ['sass'], function () {
	// some fn that is guaranteed to rnu after sass is complete
});

cb.task('sass', function processSass(options, context) {
	console.log('Running Sass');
});


cb.task('serve', ['build-all'], () => {
	bs.init({
		server: 'test/fixtures',
		open: false,
		logFileChanges: false
	});

	const tasks    = ['sass', 'reload'];

	// de-bounce HTML changes
	const w1 = cb.watch(['test/fixtures/*.html', 'test/fixtures/*.json'], tasks, {debounce: 500});

	// DO NOT de-bounce json changes
	const w2 = cb.watch(['*.json'], tasks);

	// merge 2 watchers
	merge(w1, w2)
		// filter events to only include 'change'
		.filter(x => x.event === 'change')
		// Get access to the event
		.subscribe(watchEvent => {
			console.log(watchEvent.event, watchEvent.path);
		});
});

cb.task('serve2', function (options, context, done) {
    cb.watcher(['test/fixtures/*.html'])
		.subscribe(x => {
			console.log('watcher 1', x.path);
		});

    cb.watcher(['*.json'])
		.debounce(1000)
		.subscribe(x => {
			console.log('watcher 2 json', x.path);
		})
});
