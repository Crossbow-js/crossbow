const cb = require('./').create();

cb.task('other', function (options, context, done) {
	done();
}).options({name: "alfred"});

cb.task('shane', function Kittie(options, context) {
	console.log(options);
}).options({
	dev: {
		input: "kittie"
	},
	production: {
		input: "sally"
	}
});

// console.log(cb.input);