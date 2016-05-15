const cb = require('./');
const bs = require('browser-sync').create();

cb.task('reload', function (opts) {
	bs.reload();
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
	const w2 = cb.watch(['test/fixtures/scss'], ['sass', () => bs.reload('main.css')])
    //
	// w2.watcher$
	// 	.pluck('watchEvent')
	// 	.subscribe(x => {
	// 		console.log('watcher', x);
	// 	})

	w2.tracker$
		.filter(x => {
			return x.type === 'error' && x.item.task.parents.indexOf('sass') > -1
		})
		.subscribe(x => {
			bs.notify('Error compiling SASS - please check your logs', 10000);
		})
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

