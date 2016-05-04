const cb = require('./').create();

cb.options('shane', {
	
});

cb.task('shane', function Kittie(options, context) {
	console.log(options);
})