const cb = require('./');
const bs = require('browser-sync').create();
// const merge = require('rx').Observable.merge;

// cb.task('shane', [function (options, context, done) {
// 	setTimeout(x => done(), 2000);
// }, function Shane(options, context, done) {
// 	setTimeout(x => done(), 1000);
// }]);

cb.task('reload', function (opts) {
	bs.reload();
}).options({
	dev: {
		name: "kittie"
	},
	other: {
		name: "shane"
	}
});

cb.task('build-all', ['sass']);

cb.task('sass', ['@npm node-sass test/fixtures/scss/main.scss -o test/fixtures/css']);

cb.task('serve', ['build-all'], () => {
	bs.init({
		server: 'test/fixtures',
		open: false,
		logFileChanges: false
	});

	// de-bounce HTML changes
	const w1 = cb.watch(['test/fixtures/*.html'], [() => bs.reload()]);
	const w2 = cb.watch(['test/fixtures/scss'], ['sass', () => bs.reload('main.css')]);

	// // merge 2 watchers
	// merge(w1)
	// 	// filter events to only include 'change'
	// 	.filter(x => x.event === 'change')
	// 	// Get access to the event
	// 	.subscribe(watchEvent => {
	// 		console.log(watchEvent.event, watchEvent.path);
	// 	});
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

