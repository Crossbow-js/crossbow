const cb = require('../');

cb.env({
  GREETING: 'Hello world!'
});

cb.task('hello-world', [
    '@sh echo $GREETING'
]);
