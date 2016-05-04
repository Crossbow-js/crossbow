const cb = require('./').create();

const input = ["shane"];

cb.task('shane', ['my -test']);
console.log('---');
cb.task('shane', function (options, context, done) {
	console.log('Hey');
});
console.log('---');
cb.task('shane', ['my -test'], () => {
    console.log('I called yo');
});