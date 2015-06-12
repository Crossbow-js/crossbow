var cli = require("./cli");
var assert = require("assert");

cli({input: ["run", "sass"]}, {
    pkg: {
        crossbow: {
            config: {
                sass: {
                    input: 'test/fixtures/scss/main.scss',
                    output: 'test/fixtures/css/main.min.css',
                    root: 'test/fixtures/scss'
                }
            }
        }
    }
});