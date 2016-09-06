const cli = require('./dist/index');

cli.default({
    input: ['tasks'],
    flags: {
        progress: true,
        reporters: [
            function (name, value) {
                console.log(name, value);
            }
        ]
    }
});