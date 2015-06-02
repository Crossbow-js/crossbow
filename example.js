var cli = require("./cli");

cli({input: ["run", "sass"]}, {
    config: {
        sass: {
            input: 'test/fixtures/scss/main.scss',
            output: 'test/fixtures/css/main.min.css'
        }
    }
});