var cli = require("./cli");
var assert = require("assert");

cli({input: ["watch"]}, {
    pkg: {
        crossbow: {
            watch:  {
                'bs-config': {
                    server: 'test/fixtures',
                    open: false
                },
                'tasks':       {
                    "test/fixtures/scss": ["sass"],
                    "test/fixtures/js": ["task.js"]
                }
            },
            config: {
                sass: {
                    input:  'test/fixtures/scss/main.scss',
                    output: 'test/fixtures/css/main.min.css',
                    root:   'test/fixtures/scss'
                }
            }
        }
    }
});