var cli = require("./cli");

cli({input: ["run", "sass"]}, {
    cwd: 'test/fixtures',
    paths: {
        sass: {
            input: 'scss/main.scss',
            output: 'css/main.min.css'
        }
    }
});